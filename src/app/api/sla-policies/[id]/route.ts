import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";

const updateSlaPolicySchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  responseTime: z.number().int().positive().optional().nullable(),
  resolutionTime: z.number().int().positive().optional(),
  priorities: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  queueIds: z.array(z.string()).optional(),
  businessHoursOnly: z.boolean().optional(),
  businessHoursStart: z.string().optional().nullable(),
  businessHoursEnd: z.string().optional().nullable(),
  businessDays: z.array(z.number().int().min(1).max(7)).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/sla-policies/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policy = await prisma.slaPolicy.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error fetching SLA policy:", error);
    return NextResponse.json(
      { error: "Failed to fetch SLA policy" },
      { status: 500 }
    );
  }
}

// PATCH /api/sla-policies/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateSlaPolicySchema.parse(body);

    const policy = await prisma.slaPolicy.update({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      data: validatedData,
    });

    // Log update
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "SLA_POLICY",
      resourceId: policy.id,
      metadata: validatedData,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating SLA policy:", error);
    return NextResponse.json(
      { error: "Failed to update SLA policy" },
      { status: 500 }
    );
  }
}

// DELETE /api/sla-policies/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.slaPolicy.delete({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    // Log deletion
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "SLA_POLICY",
      resourceId: params.id,
      metadata: {},
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SLA policy:", error);
    return NextResponse.json(
      { error: "Failed to delete SLA policy" },
      { status: 500 }
    );
  }
}

