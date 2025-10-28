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
          throw new Error("Введите email и пароль");
        }

        // Сначала ищем существующего пользователя
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

        // Если пользователь найден и у него есть пароль (локальная учетка)
        if (user && user.password) {
          if (!user.isActive) {
            throw new Error("Аккаунт деактивирован");
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

        // Если пользователь не найден или пароль не совпал, пробуем LDAP
        console.log(`[Auth] Trying LDAP authentication for ${credentials.email}`);
        const ldapResult = await authenticateWithLdap(
          credentials.email,
          credentials.password
        );

        if (ldapResult.success && ldapResult.user) {
          console.log(`[Auth] LDAP authentication successful for ${credentials.email}`);

          // Ищем или создаем пользователя
          const ldapUser = await prisma.user.upsert({
            where: { email: ldapResult.user.email },
            update: {
              // Обновляем имя при каждом входе
              name: ldapResult.user.name,
            },
            create: {
              email: ldapResult.user.email,
              name: ldapResult.user.name,
              password: "", // LDAP пользователи без пароля
              role: "USER", // По умолчанию обычный пользователь
              isActive: true,
              tenantId: ldapResult.user.tenantId, // Автоматически привязываем к организации
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
            throw new Error("Аккаунт деактивирован");
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

        // Ни локальная, ни LDAP аутентификация не прошли
        throw new Error("Неверный email или пароль");
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
      // Credentials provider - уже обработан в authorize
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

        // Проверяем, существует ли пользователь
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { tenant: { select: { slug: true, settings: true } } },
        });

        if (!existingUser) {
          console.log(`[SSO] New user from ${account.provider}: ${email}`);
          // Можно создать пользователя автоматически или заблокировать
          // Для безопасности, блокируем вход, если пользователь не создан вручную
          console.error("[SSO] User not found. SSO users must be pre-created by tenant admin.");
          return false;
        }

        // Проверяем, активен ли пользователь
        if (!existingUser.isActive) {
          console.error("[SSO] User is inactive");
          return false;
        }

        // Проверяем, разрешен ли SSO для tenant
        const tenantSettings = existingUser.tenant?.settings as any;
        if (!tenantSettings?.ssoEnabled) {
          console.error("[SSO] SSO is not enabled for this tenant");
          return false;
        }

        // Проверяем, соответствует ли провайдер настройкам tenant
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

      // Для OAuth провайдеров, подтягиваем данные из БД
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

