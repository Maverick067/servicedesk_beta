/**
 * Telegram Notifications Helper
 * 
 * This module handles sending notifications to Telegram for ticket events.
 */

import { prisma } from "./prisma";
import {
  sendTelegramMessage,
  formatNewTicketMessage,
  formatTicketUpdateMessage,
  formatNewCommentMessage,
} from "./telegram";

/**
 * Send notification about new ticket
 */
export async function notifyTelegramNewTicket(ticketId: string): Promise<void> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      console.error("[Telegram Notifications] Ticket not found:", ticketId);
      return;
    }

    // Get bot for this tenant
    const bot = await prisma.telegramBot.findFirst({
      where: {
        tenantId: ticket.tenantId,
        isActive: true,
        notifyOnNewTicket: true,
      },
    });

    if (!bot || !bot.groupChatId) {
      // No bot or notification group not configured
      return;
    }

    const message = formatNewTicketMessage({
      number: ticket.number,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      creator: {
        name: ticket.creator.name || "Unknown",
        email: ticket.creator.email,
      },
      tenant: {
        name: ticket.tenant.name,
      },
    });

    await sendTelegramMessage(bot.botToken, bot.groupChatId, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("[Telegram Notifications] Error notifying new ticket:", error);
  }
}

/**
 * Send notification about ticket update
 */
export async function notifyTelegramTicketUpdate(ticketId: string): Promise<void> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignee: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      console.error("[Telegram Notifications] Ticket not found:", ticketId);
      return;
    }

    const bot = await prisma.telegramBot.findFirst({
      where: {
        tenantId: ticket.tenantId,
        isActive: true,
        notifyOnTicketUpdate: true,
      },
    });

    if (!bot || !bot.groupChatId) {
      return;
    }

    const message = formatTicketUpdateMessage({
      number: ticket.number,
      title: ticket.title,
      status: ticket.status,
      assignee: ticket.assignee,
    });

    await sendTelegramMessage(bot.botToken, bot.groupChatId, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("[Telegram Notifications] Error notifying ticket update:", error);
  }
}

/**
 * Send notification about new comment
 */
export async function notifyTelegramNewComment(commentId: string): Promise<void> {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: {
            name: true,
          },
        },
        ticket: {
          select: {
            number: true,
            title: true,
            tenantId: true,
          },
        },
      },
    });

    if (!comment) {
      console.error("[Telegram Notifications] Comment not found:", commentId);
      return;
    }

    const bot = await prisma.telegramBot.findFirst({
      where: {
        tenantId: comment.ticket.tenantId,
        isActive: true,
        notifyOnNewComment: true,
      },
    });

    if (!bot || !bot.groupChatId) {
      return;
    }

    const message = formatNewCommentMessage({
      ticket: {
        number: comment.ticket.number,
        title: comment.ticket.title,
      },
      author: {
        name: comment.author.name || "Unknown",
      },
      content: comment.content,
    });

    await sendTelegramMessage(bot.botToken, bot.groupChatId, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("[Telegram Notifications] Error notifying new comment:", error);
  }
}

