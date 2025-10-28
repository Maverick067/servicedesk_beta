import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSupportTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

/**
 * GET /api/support-tickets/[id]
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

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Проверка прав доступа
    if (
      session.user.role === "TENANT_ADMIN" &&
      ticket.tenantId !== session.user.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Если тенант админ открывает свой тикет - обновляем время последнего просмотра
    if (session.user.role === "TENANT_ADMIN" && ticket.creatorId === session.user.id) {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { lastViewedByCreatorAt: new Date() },
      });
    }

    // Если супер-админ открывает тикет - обновляем время последнего просмотра
    if (session.user.role === "ADMIN") {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { lastViewedByAdminAt: new Date() },
      });
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error("Error fetching support ticket:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/support-tickets/[id]
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

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Проверка прав доступа
    if (
      session.user.role === "TENANT_ADMIN" &&
      ticket.tenantId !== session.user.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateSupportTicketSchema.parse(body);

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        resolvedAt:
          validatedData.status === "RESOLVED" ? new Date() : undefined,
        closedAt: validatedData.status === "CLOSED" ? new Date() : undefined,
      },
      include: {
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error: any) {
    console.error("Error updating support ticket:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

