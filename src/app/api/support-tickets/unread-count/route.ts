import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/support-tickets/unread-count
 * Get count of unread support tickets
 * - For TENANT_ADMIN: new replies from super-admin
 * - For ADMIN (super-admin): new comments from tenant-admins
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ====== FOR SUPER-ADMIN (ADMIN) ======
    if (session.user.role === "ADMIN") {
      // Get all support tickets with comments (not from super-admin themselves)
      const tickets = await prisma.supportTicket.findMany({
        select: {
          id: true,
          lastViewedByAdminAt: true,
          creatorId: true,
          comments: {
            where: {
              // Comments NOT from super-admin
              authorId: {
                not: session.user.id,
              },
              isInternal: false, // Not internal notes
            },
            select: {
              createdAt: true,
              authorId: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      // Count the NUMBER of unread comments
      let unreadCount = 0;
      for (const ticket of tickets) {
        if (ticket.comments.length === 0) continue;
        
        // If super-admin never opened ticket - all comments are unread
        if (!ticket.lastViewedByAdminAt) {
          unreadCount += ticket.comments.length;
          continue;
        }
        
        // Count comments newer than lastViewedByAdminAt
        const newComments = ticket.comments.filter(
          (comment) => comment.createdAt > ticket.lastViewedByAdminAt!
        );
        unreadCount += newComments.length;
      }

      console.log("📊 [ADMIN] Unread comments count:", unreadCount);
      return NextResponse.json({ count: unreadCount });
    }

    // ====== FOR TENANT-ADMIN ======
    if (session.user.role === "TENANT_ADMIN") {
      // Get all user tickets with comments
      const tickets = await prisma.supportTicket.findMany({
        where: {
          creatorId: session.user.id,
          tenantId: session.user.tenantId!,
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

      console.log("📊 [TENANT_ADMIN] Unread comments count:", unreadCount);
      return NextResponse.json({ count: unreadCount });
    }

    // For other roles - 0
    return NextResponse.json({ count: 0 });
  } catch (error: any) {
    console.error("Error counting unread support tickets:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

