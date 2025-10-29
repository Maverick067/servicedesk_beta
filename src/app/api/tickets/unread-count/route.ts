import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tickets/unread-count
 * Returns the count of unread comments in regular tickets
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.tenantId) {
      return NextResponse.json({ count: 0 });
    }

    // Don't show for super-admins (they have no tenantId)
    if (session.user.role === "ADMIN") {
      return NextResponse.json({ count: 0 });
    }

    // Get all user tickets with comments
    const tickets = await prisma.ticket.findMany({
      where: {
        creatorId: session.user.id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        lastViewedByCreatorAt: true,
        comments: {
          where: {
            authorId: {
              not: session.user.id, // Not from the user themselves
            },
            isInternal: false, // Not internal notes
          },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          // Get ALL comments, not just the last one
        },
      },
    });

    // Count the NUMBER of unread comments (not tickets!)
    let unreadCount = 0;
    for (const ticket of tickets) {
      if (ticket.comments.length === 0) continue;
      
      // If ticket was never opened - all comments are unread
      if (!ticket.lastViewedByCreatorAt) {
        unreadCount += ticket.comments.length;
        continue;
      }
      
      // Count comments newer than lastViewedByCreatorAt
      const newComments = ticket.comments.filter(
        (comment) => comment.createdAt > ticket.lastViewedByCreatorAt!
      );
      unreadCount += newComments.length;
    }

    console.log("📊 Unread ticket comments count:", unreadCount);
    return NextResponse.json({ count: unreadCount });
  } catch (error: any) {
    console.error("Error counting unread tickets:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

