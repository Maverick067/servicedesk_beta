import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tickets/unread-counts - Get count of unread comments for all tickets
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all comments that haven't been read by current user
    const where: any = {
      authorId: { not: session.user.id }, // Don't count own comments
      readBy: {
        none: {
          userId: session.user.id,
        },
      },
    };

    // Global ADMIN sees comments for all tickets, others - only their tenant
    if (session.user.role !== "ADMIN" && session.user.tenantId) {
      where.ticket = {
        tenantId: session.user.tenantId,
      };
    }

    const unreadComments = await prisma.comment.findMany({
      where,
      select: {
        id: true,
        ticketId: true,
      },
    });

    // Group by ticketId
    const unreadCounts: Record<string, number> = {};
    for (const comment of unreadComments) {
      if (!unreadCounts[comment.ticketId]) {
        unreadCounts[comment.ticketId] = 0;
      }
      unreadCounts[comment.ticketId]++;
    }

    return NextResponse.json(unreadCounts);
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread counts" },
      { status: 500 }
    );
  }
}

