import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { authenticateWithLdap } from "./ldap-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter email and password");
        }

        // First, search for existing user
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            isActive: true,
            tenantId: true,
            permissions: true,
            tenant: {
              select: {
                slug: true,
                ldapConfigs: {
                  where: { isActive: true },
                  select: { id: true },
                },
              },
            },
          },
        });

        // If user found and has password (local account)
        if (user && user.password) {
          if (!user.isActive) {
            throw new Error("Account is deactivated");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (isPasswordValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: user.tenantId,
              tenantSlug: user.tenant?.slug || null,
              permissions: user.permissions,
            };
          }
        }

        // If user not found or password doesn't match, try LDAP
        console.log(`[Auth] Trying LDAP authentication for ${credentials.email}`);
        const ldapResult = await authenticateWithLdap(
          credentials.email,
          credentials.password
        );

        if (ldapResult.success && ldapResult.user) {
          console.log(`[Auth] LDAP authentication successful for ${credentials.email}`);

          // Find or create user
          const ldapUser = await prisma.user.upsert({
            where: { email: ldapResult.user.email },
            update: {
              // Update name on each login
              name: ldapResult.user.name,
            },
            create: {
              email: ldapResult.user.email,
              name: ldapResult.user.name,
              password: "", // LDAP users have no password
              role: "USER", // Default to regular user
              isActive: true,
              tenantId: ldapResult.user.tenantId, // Automatically bind to organization
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              tenantId: true,
              permissions: true,
              tenant: {
                select: {
                  slug: true,
                },
              },
            },
          });

          if (!ldapUser.isActive) {
            throw new Error("Account is deactivated");
          }

          return {
            id: ldapUser.id,
            email: ldapUser.email,
            name: ldapUser.name,
            role: ldapUser.role,
            tenantId: ldapUser.tenantId,
            tenantSlug: ldapUser.tenant?.slug || null,
            permissions: ldapUser.permissions,
          };
        }

        // Neither local nor LDAP authentication succeeded
        throw new Error("Invalid email or password");
      },
    }),
    // Google OAuth Provider
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
    // Azure AD OAuth Provider
    ...(process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Credentials provider - already processed in authorize
      if (account?.provider === "credentials") {
        return true;
      }

      // OAuth/SSO providers
      if (account?.provider === "google" || account?.provider === "azure-ad") {
        const email = user.email || profile?.email;
        if (!email) {
          console.error("[SSO] No email provided from OAuth provider");
          return false;
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { tenant: { select: { slug: true, settings: true } } },
        });

        if (!existingUser) {
          console.log(`[SSO] New user from ${account.provider}: ${email}`);
          // Can create user automatically or block
          // For security, block login if user not created manually
          console.error("[SSO] User not found. SSO users must be pre-created by tenant admin.");
          return false;
        }

        // Check if user is active
        if (!existingUser.isActive) {
          console.error("[SSO] User is inactive");
          return false;
        }

        // Check if SSO is enabled for tenant
        const tenantSettings = existingUser.tenant?.settings as any;
        if (!tenantSettings?.ssoEnabled) {
          console.error("[SSO] SSO is not enabled for this tenant");
          return false;
        }

        // Check if provider matches tenant settings
        const allowedProvider = tenantSettings?.ssoProvider; // 'google', 'azure-ad', etc.
        if (allowedProvider && allowedProvider !== account.provider) {
          console.error(`[SSO] Provider ${account.provider} is not allowed for this tenant`);
          return false;
        }

        console.log(`[SSO] Login successful for ${email} via ${account.provider}`);
        return true;
      }

      return false;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.permissions = user.permissions;
      }

      // For OAuth providers, fetch data from database
      if (account && (account.provider === "google" || account.provider === "azure-ad")) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: {
            id: true,
            role: true,
            tenantId: true,
            permissions: true,
            tenant: { select: { slug: true } },
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.tenantSlug = dbUser.tenant?.slug || null;
          token.permissions = dbUser.permissions;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.permissions = token.permissions as any;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

