import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";

const updateLdapConfigSchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  syncEnabled: z.boolean().optional(),
  syncInterval: z.number().int().optional(),
});

/**
 * PATCH /api/ldap/[id]
 * Update LDAP configuration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateLdapConfigSchema.parse(body);

    // Get current configuration
    const existingConfig = await prisma.ldapConfig.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "LDAP config not found" },
        { status: 404 }
      );
    }

    // Check access rights
    if (
      session.user.role === "TENANT_ADMIN" &&
      session.user.tenantId !== existingConfig.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update configuration
    const updatedConfig = await prisma.ldapConfig.update({
      where: { id: params.id },
      data: validatedData,
    });

    // Log action
    await createAuditLog({
      tenantId: existingConfig.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "LDAP_CONFIG",
      resourceId: params.id,
      metadata: {
        changes: validatedData,
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error("Error updating LDAP config:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update LDAP config" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ldap/[id]
 * Delete LDAP configuration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get configuration
    const existingConfig = await prisma.ldapConfig.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "LDAP config not found" },
        { status: 404 }
      );
    }

    // Check access rights
    if (
      session.user.role === "TENANT_ADMIN" &&
      session.user.tenantId !== existingConfig.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete configuration
    await prisma.ldapConfig.delete({
      where: { id: params.id },
    });

    // Log action
    await createAuditLog({
      tenantId: existingConfig.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "LDAP_CONFIG",
      resourceId: params.id,
      metadata: {
        deletedConfig: existingConfig.name,
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting LDAP config:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete LDAP config" },
      { status: 500 }
    );
  }
}

