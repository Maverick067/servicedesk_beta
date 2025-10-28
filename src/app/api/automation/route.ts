import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const ruleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  triggerType: z.enum([
    "TICKET_CREATED",
    "TICKET_UPDATED",
    "TICKET_ASSIGNED",
    "STATUS_CHANGED",
    "PRIORITY_CHANGED",
    "COMMENT_ADDED",
    "SLA_BREACH",
    "TIME_BASED",
  ]),
  conditions: z.record(z.any()),
  actions: z.array(z.record(z.any())),
  priority: z.number().int().default(0),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("active");

    const where: any = {
      ...getTenantWhereClause(session),
    };

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const rules = await prisma.automationRule.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(rules);
  } catch (error: any) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (only TENANT_ADMIN and ADMIN)
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const data = ruleSchema.parse(json);

    const rule = await prisma.automationRule.create({
      data: {
        ...data,
        ...getTenantWhereClause(session),
      },
    });

    // Audit log
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "AUTOMATION_RULE",
      resourceId: rule.id,
      metadata: { name: rule.name },
      request,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error: any) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}


