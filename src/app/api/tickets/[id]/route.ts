import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTicketSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

// GET /api/tickets/[id] - Get one ticket
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Super-admin has no access to regular tickets
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        category: true,
        tenant: {
          select: {
            slug: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          where: session.user.role === "USER" 
            ? { isInternal: false }
            : undefined,
        },
        attachments: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Ticket visibility logic:
    // - USER: sees only their own tickets
    // - AGENT: sees all organization tickets
    // - TENANT_ADMIN: sees all organization tickets
    // - ADMIN: sees all organization tickets
    if (session.user.role === "USER" && ticket.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If ticket creator opens their ticket - update last viewed time
    if (ticket.creatorId === session.user.id) {
      await prisma.ticket.update({
        where: { id: params.id },
        data: { lastViewedByCreatorAt: new Date() },
      });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Update ticket
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTicketSchema.parse(body);

    // Check ticket existence and access rights
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Ticket update access logic:
    // - USER: can update only their own tickets
    // - AGENT: can update tickets assigned to them or all organization tickets
    // - TENANT_ADMIN: can update all organization tickets
    // - ADMIN: can update all organization tickets
    if (session.user.role === "USER" && existingTicket.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (session.user.role === "AGENT" && 
        existingTicket.creatorId !== session.user.id && 
        existingTicket.assigneeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ticket field update logic
    const updateData: any = {};
    
    if (session.user.role === "USER") {
      // Regular users can change only a limited set of fields in their tickets
      if (validatedData.title) updateData.title = validatedData.title;
      if (validatedData.description) updateData.description = validatedData.description;
    } else if (session.user.role === "AGENT") {
      // Agents can change all fields of tickets assigned to them
      Object.assign(updateData, validatedData);
      
      // Set resolvedAt when transitioning to RESOLVED
      if (validatedData.status === "RESOLVED" && !existingTicket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    } else {
      // TENANT_ADMIN and ADMIN can change all fields of all tickets
      Object.assign(updateData, validatedData);
      
      // Set resolvedAt when transitioning to RESOLVED
      if (validatedData.status === "RESOLVED" && !existingTicket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: true,
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete ticket (own tickets only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        creatorId: session.user.id, // Own tickets only
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.ticket.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}

