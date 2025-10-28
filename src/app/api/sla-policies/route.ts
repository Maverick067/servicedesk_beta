import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const createSlaPolicySchema = z.object({
  name: z.string().min(3, "Название должно содержать минимум 3 символа"),
  description: z.string().optional(),
  responseTime: z.number().int().positive().optional(),
  resolutionTime: z.number().int().positive("Время решения обязательно"),
  priorities: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  queueIds: z.array(z.string()).default([]),
  businessHoursOnly: z.boolean().default(false),
  businessHoursStart: z.string().optional(),
  businessHoursEnd: z.string().optional(),
  businessDays: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5]),
  isActive: z.boolean().default(true),
});

// GET /api/sla-policies - Получить все SLA политики
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN и ADMIN могут просматривать SLA политики
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Суперадмин (ADMIN без tenantId) видит все политики
    const whereClause = session.user.role === "ADMIN" && !session.user.tenantId
      ? {} // Суперадмин видит все
      : { tenantId: session.user.tenantId };

    const policies = await prisma.slaPolicy.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Error fetching SLA policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch SLA policies" },
      { status: 500 }
    );
  }
}

// POST /api/sla-policies - Создать новую SLA политику
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN может создавать SLA политики
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createSlaPolicySchema.parse(body);

    const policy = await prisma.slaPolicy.create({
      data: {
        ...validatedData,
        tenantId: session.user.tenantId,
      },
    });

    // Логируем создание политики
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "SLA_POLICY",
      resourceId: policy.id,
      metadata: {
        name: policy.name,
        resolutionTime: policy.resolutionTime,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating SLA policy:", error);
    return NextResponse.json(
      { error: "Failed to create SLA policy" },
      { status: 500 }
    );
  }
}

