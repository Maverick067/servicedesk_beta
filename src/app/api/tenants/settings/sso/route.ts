import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tenants/settings/sso - Get SSO settings for tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access rights
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

    // Super-admin doesn't have tenantId, return empty settings
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

    // Get tenant settings
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
      googleClientSecret: "", // Don't return secrets
      azureAdClientId: settings.azureAdClientId || "",
      azureAdClientSecret: "", // Don't return secrets
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
 * POST /api/tenants/settings/sso - Update SSO settings for tenant
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

    // Check access rights
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

    // Check subscription (SSO available only for PRO and ENTERPRISE)
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
            "SSO is only available for PRO and ENTERPRISE plans. Upgrade your subscription.",
        },
        { status: 403 }
      );
    }

    // Get current settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true },
    });

    const currentSettings = (tenant?.settings as any) || {};

    // Update only provided fields
    const updatedSettings = {
      ...currentSettings,
      ssoEnabled,
      ssoProvider,
    };

    // Add credentials only if they are not empty
    if (googleClientId) updatedSettings.googleClientId = googleClientId;
    if (googleClientSecret)
      updatedSettings.googleClientSecret = googleClientSecret;
    if (azureAdClientId) updatedSettings.azureAdClientId = azureAdClientId;
    if (azureAdClientSecret)
      updatedSettings.azureAdClientSecret = azureAdClientSecret;
    if (azureAdTenantId) updatedSettings.azureAdTenantId = azureAdTenantId;

    // Save to database
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { settings: updatedSettings },
    });

    console.log(`[SSO Settings] Updated for tenant ${user.tenantId}`);

    return NextResponse.json({
      success: true,
      message: "SSO settings updated",
    });
  } catch (error) {
    console.error("[SSO Settings API] Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

