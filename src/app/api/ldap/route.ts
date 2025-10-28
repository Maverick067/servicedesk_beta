import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const ldapConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["LDAP", "ACTIVE_DIRECTORY", "OAUTH2", "SAML"]),
  isActive: z.boolean().default(false),
  host: z.string().optional(),
  port: z.number().int().optional(),
  useSSL: z.boolean().optional().default(false),
  baseDn: z.string().optional(),
  bindDn: z.string().optional(),
  bindPassword: z.string().optional(),
  userSearchBase: z.string().optional(),
  userSearchFilter: z.string().optional(),
  attributeMapping: z.record(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const configs = await prisma.ldapConfig.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Для глобального ADMIN разрешаем, если он управляет через UI tenant'ом
    if (!session.user.tenantId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: No tenant" }, { status: 401 });
    }
    
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const data = ldapConfigSchema.parse(json);

    // Если нет tenantId в сессии, это ошибка
    if (!session.user.tenantId) {
      return NextResponse.json(
        { 
          error: "Невозможно создать LDAP подключение без контекста организации. Войдите как TENANT_ADMIN конкретной организации.",
          message: "Глобальный администратор не может создавать LDAP конфигурации. Переключитесь на учетную запись администратора организации."
        },
        { status: 400 }
      );
    }

    const config = await prisma.ldapConfig.create({
      data: { 
        ...data, 
        tenantId: session.user.tenantId 
      },
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "LDAP_CONFIG",
      resourceId: config.id,
      metadata: { name: config.name, type: config.type },
      request,
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



