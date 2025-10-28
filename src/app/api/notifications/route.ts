import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications - Получить уведомления с группировкой
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get("grouped") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (grouped) {
      // Получить сгруппированные уведомления
      const groups = await prisma.notificationGroup.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly && { isRead: false }),
          isDismissed: false,
        },
        include: {
          notifications: {
            take: 3, // Показать первые 3 уведомления в группе
            orderBy: { createdAt: "desc" },
            include: {
              ticket: {
                select: {
                  id: true,
                  number: true,
                  title: true,
                  status: true,
                  priority: true,
                },
              },
            },
          },
          _count: {
            select: {
              notifications: true,
            },
          },
        },
        orderBy: { lastEventAt: "desc" },
        take: limit,
      });

      return NextResponse.json(groups);
    } else {
      // Получить несгруппированные уведомления
      const notifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly && { isRead: false }),
          groupId: null, // Только уведомления вне групп
        },
        include: {
          ticket: {
            select: {
              id: true,
              number: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return NextResponse.json(notifications);
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// GET /api/notifications/count - Получить количество непрочитанных
export async function HEAD(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [notificationCount, groupCount] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          groupId: null,
        },
      }),
      prisma.notificationGroup.count({
        where: {
          userId: session.user.id,
          isRead: false,
          isDismissed: false,
        },
      }),
    ]);

    return NextResponse.json({
      unreadCount: notificationCount + groupCount,
      notificationCount,
      groupCount,
    });
  } catch (error) {
    console.error("Error counting notifications:", error);
    return NextResponse.json(
      { error: "Failed to count notifications" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/mark-read - Пометить как прочитанное
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, groupId, markAll } = body;

    if (markAll) {
      // Пометить все как прочитанное
      await Promise.all([
        prisma.notification.updateMany({
          where: {
            userId: session.user.id,
            isRead: false,
          },
          data: { isRead: true },
        }),
        prisma.notificationGroup.updateMany({
          where: {
            userId: session.user.id,
            isRead: false,
          },
          data: { isRead: true },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    if (groupId) {
      // Пометить группу как прочитанную
      await Promise.all([
        prisma.notificationGroup.update({
          where: { id: groupId, userId: session.user.id },
          data: { isRead: true },
        }),
        prisma.notification.updateMany({
          where: { groupId, userId: session.user.id },
          data: { isRead: true },
        }),
      ]);
    } else if (notificationId) {
      // Пометить одно уведомление как прочитанное
      await prisma.notification.update({
        where: { id: notificationId, userId: session.user.id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Удалить/скрыть уведомления
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const notificationId = searchParams.get("notificationId");

    if (groupId) {
      // Скрыть группу
      await prisma.notificationGroup.update({
        where: { id: groupId, userId: session.user.id },
        data: { isDismissed: true },
      });
    } else if (notificationId) {
      // Удалить уведомление
      await prisma.notification.delete({
        where: { id: notificationId, userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
