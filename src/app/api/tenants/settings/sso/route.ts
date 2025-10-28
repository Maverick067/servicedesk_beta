import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tenants/settings/sso - Получить настройки SSO для tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права доступа
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only tenant admins can view SSO settings" },
        { status: 403 }
      );
    }

    // Суперадмин не имеет tenantId, возвращаем пустые настройки
    if (user.role === "ADMIN" && !user.tenantId) {
      return NextResponse.json({
        ssoEnabled: false,
        ssoProvider: "google",
        googleClientId: "",
        googleClientSecret: "",
        azureAdClientId: "",
        azureAdClientSecret: "",
        azureAdTenantId: "",
      });
    }

    if (!user.tenantId) {
      return NextResponse.json(
        { error: "No tenant associated with user" },
        { status: 400 }
      );
    }

    // Получаем tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const settings = (tenant.settings as any) || {};
    const ssoSettings = {
      ssoEnabled: settings.ssoEnabled || false,
      ssoProvider: settings.ssoProvider || "google",
      googleClientId: settings.googleClientId || "",
      googleClientSecret: "", // Не возвращаем секреты
      azureAdClientId: settings.azureAdClientId || "",
      azureAdClientSecret: "", // Не возвращаем секреты
      azureAdTenantId: settings.azureAdTenantId || "",
    };

    return NextResponse.json(ssoSettings);
  } catch (error) {
    console.error("[SSO Settings API] Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/settings/sso - Обновить настройки SSO для tenant
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      ssoEnabled,
      ssoProvider,
      googleClientId,
      googleClientSecret,
      azureAdClientId,
      azureAdClientSecret,
      azureAdTenantId,
    } = body;

    // Проверяем права доступа
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only tenant admins can update SSO settings" },
        { status: 403 }
      );
    }

    if (!user.tenantId) {
      return NextResponse.json(
        { error: "No tenant associated with user" },
        { status: 400 }
      );
    }

    // Проверяем subscription (SSO доступен только для PRO и ENTERPRISE)
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (
      ssoEnabled &&
      subscription &&
      !subscription.ssoEnabled &&
      subscription.plan !== "PRO" &&
      subscription.plan !== "ENTERPRISE"
    ) {
      return NextResponse.json(
        {
          error:
            "SSO доступен только для планов PRO и ENTERPRISE. Обновите подписку.",
        },
        { status: 403 }
      );
    }

    // Получаем текущие settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true },
    });

    const currentSettings = (tenant?.settings as any) || {};

    // Обновляем только предоставленные поля
    const updatedSettings = {
      ...currentSettings,
      ssoEnabled,
      ssoProvider,
    };

    // Добавляем credentials только если они не пустые
    if (googleClientId) updatedSettings.googleClientId = googleClientId;
    if (googleClientSecret)
      updatedSettings.googleClientSecret = googleClientSecret;
    if (azureAdClientId) updatedSettings.azureAdClientId = azureAdClientId;
    if (azureAdClientSecret)
      updatedSettings.azureAdClientSecret = azureAdClientSecret;
    if (azureAdTenantId) updatedSettings.azureAdTenantId = azureAdTenantId;

    // Сохраняем в БД
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { settings: updatedSettings },
    });

    console.log(`[SSO Settings] Updated for tenant ${user.tenantId}`);

    return NextResponse.json({
      success: true,
      message: "Настройки SSO обновлены",
    });
  } catch (error) {
    console.error("[SSO Settings API] Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

