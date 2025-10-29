import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const createQueueSchema = z.object({
  name: z.string().min(2, "Name must contain at least 2 characters"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
  icon: z.string().optional(),
  priority: z.number().int().min(0).optional(),
});

// GET /api/queues - Get all queues
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const queues = await prisma.queue.findMany({
      where: { ...getTenantWhereClause(session) },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(queues);
  } catch (error) {
    console.error("Error fetching queues:", error);
    return NextResponse.json(
      { error: "Failed to fetch queues" },
      { status: 500 }
    );
  }
}

// POST /api/queues - Create new queue
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only TENANT_ADMIN and ADMIN can create queues
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createQueueSchema.parse(body);
    const tenantId = getTenantIdForCreate(session, body.tenantId);

    const queue = await prisma.queue.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color || "#8b5cf6",
        icon: validatedData.icon,
        priority: validatedData.priority || 0,
        tenantId,
      },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    // Log queue creation
    await createAuditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "QUEUE",
      resourceId: queue.id,
      metadata: {
        name: queue.name,
        color: queue.color,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(queue, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating queue:", error);
    return NextResponse.json(
      { error: "Failed to create queue" },
      { status: 500 }
    );
  }
}

