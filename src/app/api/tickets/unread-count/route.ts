import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tickets/unread-count
 * Возвращает количество непрочитанных комментариев в обычных тикетах
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.tenantId) {
      return NextResponse.json({ count: 0 });
    }

    // Не показываем для супер-админов (у них нет tenantId)
    if (session.user.role === "ADMIN") {
      return NextResponse.json({ count: 0 });
    }

    // Получаем все тикеты пользователя с комментариями
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
              not: session.user.id, // Не от самого пользователя
            },
            isInternal: false, // Не внутренние заметки
          },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          // Берем ВСЕ комментарии, а не только последний
        },
      },
    });

    // Считаем КОЛИЧЕСТВО непрочитанных комментариев (не тикетов!)
    let unreadCount = 0;
    for (const ticket of tickets) {
      if (ticket.comments.length === 0) continue;
      
      // Если тикет никогда не открывался - все комментарии непрочитанные
      if (!ticket.lastViewedByCreatorAt) {
        unreadCount += ticket.comments.length;
        continue;
      }
      
      // Считаем комментарии новее lastViewedByCreatorAt
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

