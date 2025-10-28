import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/support-tickets/unread-count
 * Получить количество непрочитанных support тикетов
 * - Для TENANT_ADMIN: новые ответы от супер-админа
 * - Для ADMIN (супер-админ): новые комментарии от tenant-админов
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ====== ДЛЯ СУПЕР-АДМИНА (ADMIN) ======
    if (session.user.role === "ADMIN") {
      // Получаем все support тикеты с комментариями (не от самого супер-админа)
      const tickets = await prisma.supportTicket.findMany({
        select: {
          id: true,
          lastViewedByAdminAt: true,
          creatorId: true,
          comments: {
            where: {
              // Комментарии НЕ от супер-админа
              authorId: {
                not: session.user.id,
              },
              isInternal: false, // Не внутренние заметки
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

      // Считаем КОЛИЧЕСТВО непрочитанных комментариев
      let unreadCount = 0;
      for (const ticket of tickets) {
        if (ticket.comments.length === 0) continue;
        
        // Если супер-админ никогда не открывал тикет - все комментарии непрочитанные
        if (!ticket.lastViewedByAdminAt) {
          unreadCount += ticket.comments.length;
          continue;
        }
        
        // Считаем комментарии новее lastViewedByAdminAt
        const newComments = ticket.comments.filter(
          (comment) => comment.createdAt > ticket.lastViewedByAdminAt!
        );
        unreadCount += newComments.length;
      }

      console.log("📊 [ADMIN] Unread comments count:", unreadCount);
      return NextResponse.json({ count: unreadCount });
    }

    // ====== ДЛЯ TENANT-АДМИНА ======
    if (session.user.role === "TENANT_ADMIN") {
      // Получаем все тикеты пользователя с комментариями
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

      console.log("📊 [TENANT_ADMIN] Unread comments count:", unreadCount);
      return NextResponse.json({ count: unreadCount });
    }

    // Для других ролей - 0
    return NextResponse.json({ count: 0 });
  } catch (error: any) {
    console.error("Error counting unread support tickets:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

