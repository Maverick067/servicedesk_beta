import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";

const updateQueueSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/queues/[id] - Получить одну очередь
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const queue = await prisma.queue.findFirst({
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

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    return NextResponse.json(queue);
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

// PATCH /api/queues/[id] - Обновить очередь
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN и ADMIN могут обновлять очереди
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateQueueSchema.parse(body);

    // Проверяем, что очередь существует и принадлежит к той же организации
    const existingQueue = await prisma.queue.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingQueue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    const updatedQueue = await prisma.queue.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    // Логируем обновление
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "QUEUE",
      resourceId: updatedQueue.id,
      metadata: {
        changes: validatedData,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(updatedQueue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating queue:", error);
    return NextResponse.json(
      { error: "Failed to update queue" },
      { status: 500 }
    );
  }
}

// DELETE /api/queues/[id] - Удалить очередь
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN и ADMIN могут удалять очереди
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const queue = await prisma.queue.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    await prisma.queue.delete({
      where: { id: params.id },
    });

    // Логируем удаление
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "QUEUE",
      resourceId: params.id,
      metadata: {
        name: queue.name,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ message: "Queue deleted successfully" });
  } catch (error) {
    console.error("Error deleting queue:", error);
    return NextResponse.json(
      { error: "Failed to delete queue" },
      { status: 500 }
    );
  }
}

