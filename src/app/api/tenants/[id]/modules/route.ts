import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import {
  FeatureFlag,
  MODULE_PLAN_REQUIREMENTS,
  isModuleAvailableOnPlan,
  SubscriptionPlan,
} from "@/lib/feature-flags";

const updateModulesSchema = z.object({
  modules: z.record(z.boolean()),
});

// GET /api/tenants/[id]/modules - Получить настройки модулей
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN может просматривать настройки своего tenant
    // ADMIN может просматривать любой tenant
    if (session.user.role === "TENANT_ADMIN" && session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      modules: (tenant.settings as any)?.modules || {},
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}

// PATCH /api/tenants/[id]/modules - Обновить настройки модулей
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN может обновлять настройки своего tenant
    // ADMIN (супер админ) может обновлять любой tenant
    if (session.user.role === "TENANT_ADMIN" && session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateModulesSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        settings: true,
        subscription: {
          select: {
            plan: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Определяем текущий план (если нет subscription, то FREE)
    const currentPlan = (tenant.subscription?.plan || "FREE") as SubscriptionPlan;

    // Проверяем права на изменение модулей
    const isGlobalAdmin = session.user.role === "ADMIN" && !session.user.tenantId;
    const isTenantAdmin = session.user.role === "TENANT_ADMIN";

    // Если это tenant admin, проверяем, что он пытается изменить только бесплатные модули
    if (isTenantAdmin) {
      for (const [module, enabled] of Object.entries(validatedData.modules)) {
        const requiredPlan = MODULE_PLAN_REQUIREMENTS[module as FeatureFlag];
        
        // Tenant admin может включать/выключать только бесплатные модули
        if (requiredPlan !== "FREE" && enabled) {
          return NextResponse.json(
            { 
              error: "Forbidden", 
              message: `Модуль "${module}" доступен только на плане ${requiredPlan}. Обновите подписку для его активации.`
            },
            { status: 403 }
          );
        }

        // Tenant admin не может отключать платные модули, которые уже активны по подписке
        if (requiredPlan !== "FREE" && !enabled) {
          const currentModules = (tenant.settings as any)?.modules || {};
          if (currentModules[module]) {
            return NextResponse.json(
              { 
                error: "Forbidden", 
                message: `Модуль "${module}" активен по вашей подписке и не может быть отключен вручную.`
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Если это глобальный админ, он может включать/выключать любые модули
    // независимо от подписки tenant'а

    const currentSettings = (tenant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      modules: {
        ...currentSettings.modules,
        ...validatedData.modules,
      },
    };

    const updatedTenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        settings: updatedSettings,
      },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    // Логируем изменение модулей
    await createAuditLog({
      tenantId: params.id,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "TENANT_MODULES",
      resourceId: params.id,
      metadata: {
        modules: validatedData.modules,
        updatedBy: isGlobalAdmin ? "GLOBAL_ADMIN" : "TENANT_ADMIN",
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      modules: (updatedTenant.settings as any)?.modules || {},
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating modules:", error);
    return NextResponse.json(
      { error: "Failed to update modules" },
      { status: 500 }
    );
  }
}

