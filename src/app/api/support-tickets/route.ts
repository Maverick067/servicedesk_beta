import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSupportTicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

/**
 * GET /api/support-tickets
 * Get support tickets
 * - TENANT_ADMIN: sees their own tickets
 * - SUPER_ADMIN: sees all tickets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TENANT_ADMIN have access to support tickets
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let where: any = {};

    // TENANT_ADMIN sees only their own tickets
    if (session.user.role === "TENANT_ADMIN" && session.user.tenantId) {
      where.tenantId = session.user.tenantId;
    }
    // SUPER_ADMIN sees all tickets (where is empty)

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        tenant: {
          select: {
            name: true,
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
  } catch (error: any) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support-tickets
 * Create support ticket (TENANT_ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only TENANT_ADMIN can create support tickets
    if (session.user.role !== "TENANT_ADMIN" || !session.user.tenantId) {
      return NextResponse.json(
        { error: "Only tenant administrators can create support tickets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createSupportTicketSchema.parse(body);

    const ticket = await prisma.supportTicket.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority || "MEDIUM",
        tenantId: session.user.tenantId,
        creatorId: session.user.id,
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

    console.log(
      `[SUPPORT TICKET] Created by ${session.user.email} from ${ticket.tenant.name}`
    );

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error("Error creating support ticket:", error);

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

