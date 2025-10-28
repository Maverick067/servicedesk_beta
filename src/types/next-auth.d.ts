import { UserRole } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId: string;
      tenantSlug: string;
      permissions?: any;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    tenantId: string;
    tenantSlug: string;
    permissions?: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantId: string;
    tenantSlug: string;
    permissions?: any;
  }
}

