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

    // TENANT_ADMIN sees only their own tickets
    if (session.user.role === "TENANT_ADMIN" && session.user.tenantId) {
      const tickets = await prisma.supportTicket.findMany({
        where: {
          tenantId: session.user.tenantId,
        },
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
    }

    // SUPER_ADMIN (ADMIN without tenantId) - try Prisma first, fallback to raw SQL if RLS blocks
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      try {
        // Try Prisma query first
        const tickets = await prisma.supportTicket.findMany({
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
      } catch (prismaError: any) {
        console.error("Prisma query failed for super-admin, trying raw query:", prismaError);

        // Fallback to raw query if Prisma fails due to RLS
        try {
          const tickets = await prisma.$queryRaw<Array<{
            id: string;
            number: number;
            title: string;
            description: string;
            status: string;
            priority: string;
            tenantId: string;
            creatorId: string;
            createdAt: Date;
            updatedAt: Date;
            tenant_name: string;
            tenant_slug: string;
            comments_count: bigint;
          }>>`
            SELECT
              st.id,
              st.number,
              st.title,
              st.description,
              st.status,
              st.priority,
              st."tenantId",
              st."creatorId",
              st."createdAt",
              st."updatedAt",
              t.name as tenant_name,
              t.slug as tenant_slug,
              COALESCE((SELECT COUNT(*) FROM support_comments WHERE "ticketId" = st.id), 0)::bigint as comments_count
            FROM support_tickets st
            LEFT JOIN tenants t ON st."tenantId" = t.id
            ORDER BY st."createdAt" DESC
          `;

          // Transform to match expected format
          const formatted = tickets.map((t) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            tenantId: t.tenantId,
            creatorId: t.creatorId,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            tenant: {
              name: t.tenant_name,
              slug: t.tenant_slug,
            },
            _count: {
              comments: Number(t.comments_count) || 0,
            },
          }));

          return NextResponse.json(formatted);
        } catch (rawError: any) {
          console.error("Raw query also failed:", rawError);
          // Last resort: return empty array
          return NextResponse.json([]);
        }
      }
    }

    // Fallback for other cases
    return NextResponse.json([]);
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

