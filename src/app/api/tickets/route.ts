import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createTicketNotifications } from "@/lib/notifications";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import { calculateSlaDueDate } from "@/lib/sla-utils";
import { autoAssignTicket } from "@/lib/ticket-assignment";

const createTicketSchema = z.object({
  title: z.string().min(3, "Title must contain at least 3 characters"),
  description: z.string().min(5, "Description must contain at least 5 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  queueId: z.string().optional(),
  categoryId: z.string().optional(),
  customFields: z.record(z.string()).optional(), // { fieldId: value }
});

// GET /api/tickets - Get all tickets (with tenant consideration)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const queueId = searchParams.get("queue");

    const where: any = {};

    // Global ADMIN (without tenantId) does NOT see regular tickets
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      // Super-admin works only with support tickets
      return NextResponse.json([]);
    }

    // All other roles are filtered by tenantId
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }
    where.tenantId = session.user.tenantId;

    // Ticket visibility logic:
    // - USER: sees only their own tickets (created by them)
    // - AGENT: sees ALL tickets of their tenant (supporting all clients)
    // - TENANT_ADMIN: sees ALL tickets of their organization
    if (session.user.role === "USER") {
      where.creatorId = session.user.id;
    }
    // AGENT and TENANT_ADMIN see all tickets of their tenant (tenantId filter already set)

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (queueId) {
      where.queueId = queueId;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        number: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        slaDueDate: true,
        slaBreached: true,
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
        queue: true,
        tenant: {
          select: {
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Super-admin cannot create regular tickets (only support tickets)
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      return NextResponse.json(
        { error: "Super admins cannot create regular tickets. Use support tickets instead." },
        { status: 403 }
      );
    }

    // Check for tenantId
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // Generate next ticket number for this tenant
    const lastTicket = await prisma.ticket.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const nextNumber = (lastTicket?.number || 0) + 1;

    // Calculate SLA for ticket
    const now = new Date();
    const slaData = await calculateSlaDueDate({
      priority: validatedData.priority,
      categoryId: validatedData.categoryId || null,
      queueId: validatedData.queueId || null,
      tenantId: session.user.tenantId,
      createdAt: now,
    });

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        number: nextNumber,
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        queueId: validatedData.queueId,
        categoryId: validatedData.categoryId,
        tenantId: session.user.tenantId,
        creatorId: session.user.id,
        status: "OPEN",
        slaId: slaData?.slaId,
        slaDueDate: slaData?.slaDueDate,
        slaBreached: false,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: true,
        queue: true,
        slaPolicy: true,
      },
    });

    // Save custom field values
    if (validatedData.customFields && Object.keys(validatedData.customFields).length > 0) {
      const customFieldValues = Object.entries(validatedData.customFields).map(
        ([fieldId, value]) => ({
          customFieldId: fieldId,
          ticketId: ticket.id,
          value: String(value),
        })
      );

      await prisma.customFieldValue.createMany({
        data: customFieldValues,
      });
    }

    // 🤖 Automatic ticket distribution among agents
    const assignedAgentId = await autoAssignTicket({
      tenantId: session.user.tenantId,
      categoryId: validatedData.categoryId || null,
    });

    // Update ticket with assigned agent
    if (assignedAgentId) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { assigneeId: assignedAgentId },
      });
    }

    // Create notifications for new ticket
    try {
      await createTicketNotifications(
        ticket.id,
        "TICKET_CREATED",
        ticket.title,
        session.user.id,
        assignedAgentId || undefined
      );
    } catch (error) {
      console.error("Error creating notifications:", error);
      // Don't interrupt ticket creation due to notification error
    }

    // Log ticket creation
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "TICKET",
      resourceId: ticket.id,
      metadata: {
        title: ticket.title,
        priority: ticket.priority,
        categoryId: ticket.categoryId,
        number: ticket.number,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
