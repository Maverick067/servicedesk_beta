import { prisma } from "@/lib/prisma";

export interface CreateNotificationData {
  type: "TICKET_CREATED" | "TICKET_ASSIGNED" | "TICKET_UPDATED" | "COMMENT_ADDED" | "TICKET_RESOLVED" | "TICKET_CLOSED";
  title: string;
  message: string;
  userId: string;
  ticketId?: string;
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId,
        ticketId: data.ticketId,
      },
    });

    console.log(`Notification created: ${data.type} for user ${data.userId}`);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function createTicketNotifications(
  ticketId: string,
  type: "TICKET_CREATED" | "TICKET_ASSIGNED" | "TICKET_UPDATED" | "TICKET_RESOLVED" | "TICKET_CLOSED",
  ticketTitle: string,
  creatorId: string,
  assigneeId?: string
) {
  try {
    // Получаем информацию о тикете
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        creator: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        category: { select: { name: true } },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const notifications = [];

    // Уведомляем создателя тикета (если это не он сам создал уведомление)
    if (type !== "TICKET_CREATED" && creatorId) {
      const creatorNotification = await createNotification({
        type,
        title: `Тикет "${ticketTitle}" обновлен`,
        message: `Статус тикета "${ticketTitle}" был изменен`,
        userId: creatorId,
        ticketId,
      });
      notifications.push(creatorNotification);
    }

    // Уведомляем назначенного агента (если есть и это не он сам)
    if (assigneeId && assigneeId !== creatorId) {
      const assigneeNotification = await createNotification({
        type,
        title: `Тикет "${ticketTitle}" назначен вам`,
        message: `Вам назначен тикет "${ticketTitle}" в категории "${ticket.category?.name || 'Без категории'}"`,
        userId: assigneeId,
        ticketId,
      });
      notifications.push(assigneeNotification);
    }

    // Уведомляем всех агентов организации о новом тикете
    if (type === "TICKET_CREATED") {
      const agents = await prisma.user.findMany({
        where: {
          tenantId: ticket.tenantId,
          role: "AGENT",
          isActive: true,
        },
        select: { id: true },
      });

      for (const agent of agents) {
        if (agent.id !== creatorId) {
          const agentNotification = await createNotification({
            type: "TICKET_CREATED",
            title: `Новый тикет "${ticketTitle}"`,
            message: `Создан новый тикет "${ticketTitle}" в категории "${ticket.category?.name || 'Без категории'}"`,
            userId: agent.id,
            ticketId,
          });
          notifications.push(agentNotification);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error creating ticket notifications:", error);
    throw error;
  }
}

export async function createCommentNotification(
  ticketId: string,
  commentAuthorId: string,
  commentContent: string
) {
  try {
    // Получаем информацию о тикете и комментарии
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const notifications = [];
    const commentAuthor = await prisma.user.findUnique({
      where: { id: commentAuthorId },
      select: { name: true },
    });

    // Уведомляем создателя тикета (если это не он сам комментирует)
    if (ticket.creatorId !== commentAuthorId) {
      const creatorNotification = await createNotification({
        type: "COMMENT_ADDED",
        title: `Новый комментарий к тикету "${ticket.title}"`,
        message: `${commentAuthor?.name || 'Пользователь'} добавил комментарий: "${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}"`,
        userId: ticket.creatorId,
        ticketId,
      });
      notifications.push(creatorNotification);
    }

    // Уведомляем назначенного агента (если есть и это не он сам комментирует)
    if (ticket.assigneeId && ticket.assigneeId !== commentAuthorId && ticket.assigneeId !== ticket.creatorId) {
      const assigneeNotification = await createNotification({
        type: "COMMENT_ADDED",
        title: `Новый комментарий к тикету "${ticket.title}"`,
        message: `${commentAuthor?.name || 'Пользователь'} добавил комментарий: "${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}"`,
        userId: ticket.assigneeId,
        ticketId,
      });
      notifications.push(assigneeNotification);
    }

    return notifications;
  } catch (error) {
    console.error("Error creating comment notification:", error);
    throw error;
  }
}