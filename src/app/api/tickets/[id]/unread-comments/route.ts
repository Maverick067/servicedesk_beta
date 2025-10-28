import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tickets/[id]/unread-comments - Получить количество непрочитанных комментариев
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Находим все комментарии тикета, которые не были прочитаны текущим пользователем
    const unreadCount = await prisma.comment.count({
      where: {
        ticketId: params.id,
        authorId: { not: session.user.id }, // Не считаем свои комментарии
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

// POST /api/tickets/[id]/unread-comments - Пометить комментарии как прочитанные
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Находим все непрочитанные комментарии тикета
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

    // Помечаем их как прочитанные
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

