import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  triggerType: z.enum([
    "TICKET_CREATED",
    "TICKET_UPDATED",
    "TICKET_ASSIGNED",
    "STATUS_CHANGED",
    "PRIORITY_CHANGED",
    "COMMENT_ADDED",
    "SLA_BREACH",
    "TIME_BASED",
  ]).optional(),
  conditions: z.record(z.any()).optional(),
  actions: z.array(z.record(z.any())).optional(),
  priority: z.number().int().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error: any) {
    console.error("Error fetching automation rule:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const data = updateRuleSchema.parse(json);

    const rule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updatedRule = await prisma.automationRule.update({
      where: { id: params.id },
      data,
    });

    // Audit log
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "AUTOMATION_RULE",
      resourceId: updatedRule.id,
      metadata: { name: updatedRule.name },
      request,
    });

    return NextResponse.json(updatedRule);
  } catch (error: any) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rule = await prisma.automationRule.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await prisma.automationRule.delete({
      where: { id: params.id },
    });

    // Audit log
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "AUTOMATION_RULE",
      resourceId: rule.id,
      metadata: { name: rule.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

