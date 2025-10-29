import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(2, "Name must contain at least 2 characters"),
  settings: z.object({
    ticketPrefix: z.string().optional(),
  }).optional(),
});

/**
 * GET /api/tenants/[id]
 * Get organization information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access rights
    const canAccess =
      session.user.role === "ADMIN" || // Global admin
      (session.user.role === "TENANT_ADMIN" && session.user.tenantId === params.id); // Admin of their organization

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
            categories: true,
            queues: true,
            customFields: true,
          },
        },
        users: {
          where: {
            role: "AGENT",
            isActive: true,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Count open tickets
    const openTicketsCount = await prisma.ticket.count({
      where: {
        tenantId: params.id,
        status: {
          notIn: ["RESOLVED", "CLOSED"],
        },
      },
    });

    // Form response
    const response = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      customDomain: tenant.customDomain,
      customDomainVerified: tenant.customDomainVerified,
      settings: tenant.settings || {},
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      stats: {
        totalUsers: tenant._count.users,
        totalAgents: tenant.users.length,
        totalTickets: tenant._count.tickets,
        openTickets: openTicketsCount,
        categories: tenant._count.categories,
        queues: tenant._count.queues,
        customFields: tenant._count.customFields,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenants/[id]
 * Update organization information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access rights
    const canUpdate =
      session.user.role === "ADMIN" || // Global admin
      (session.user.role === "TENANT_ADMIN" && session.user.tenantId === params.id); // Admin of their organization

    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTenantSchema.parse(body);

    // Get current settings
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      select: { settings: true },
    });

    if (!currentTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Merge settings
    const currentSettings = (currentTenant.settings as any) || {};
    const newSettings = {
      ...currentSettings,
      ...(validatedData.settings || {}),
    };

    const updatedTenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        settings: newSettings,
      },
    });

    return NextResponse.json(updatedTenant);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[id]
 * Delete organization (DANGEROUS OPERATION!)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only global admin can delete organizations
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check confirmation
    const { confirmation } = await request.json();
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Confirmation required" },
        { status: 400 }
      );
    }

    await prisma.tenant.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Tenant deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
