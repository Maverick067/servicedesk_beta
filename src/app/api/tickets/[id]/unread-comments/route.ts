import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tickets/[id]/unread-comments - Get count of unread comments
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all ticket comments that haven't been read by current user
    const unreadCount = await prisma.comment.count({
      where: {
        ticketId: params.id,
        authorId: { not: session.user.id }, // Don't count own comments
        readBy: {
          none: {
            userId: session.user.id,
          },
        },
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread comments" },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/unread-comments - Mark comments as read
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all unread comments for ticket
    const unreadComments = await prisma.comment.findMany({
      where: {
        ticketId: params.id,
        authorId: { not: session.user.id },
        readBy: {
          none: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    // Mark them as read
    if (unreadComments.length > 0) {
      await prisma.commentRead.createMany({
        data: unreadComments.map((comment) => ({
          userId: session.user.id,
          commentId: comment.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ markedAsRead: unreadComments.length });
  } catch (error) {
    console.error("Error marking comments as read:", error);
    return NextResponse.json(
      { error: "Failed to mark comments as read" },
      { status: 500 }
    );
  }
}

