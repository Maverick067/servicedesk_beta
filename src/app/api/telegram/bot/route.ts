import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getTelegramBotInfo,
  setTelegramWebhook,
  deleteTelegramWebhook,
} from "@/lib/telegram";

/**
 * GET /api/telegram/bot - Получить настройки Telegram бота
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Только TENANT_ADMIN и ADMIN могут управлять ботом
    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = user.role === "ADMIN" && !user.tenantId ? null : user.tenantId;

    if (!tenantId && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Для global ADMIN без tenantId - возвращаем пустой результат
    if (!tenantId) {
      return NextResponse.json({ bot: null });
    }

    const bot = await prisma.telegramBot.findFirst({
      where: { tenantId },
      include: {
        users: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            chatId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ bot });
  } catch (error) {
    console.error("[Telegram Bot GET Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/telegram/bot - Создать/обновить Telegram бота
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { botToken, groupChatId, notifyOnNewTicket, notifyOnTicketUpdate, notifyOnNewComment } = body;

    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token is required" },
        { status: 400 }
      );
    }

    // Проверяем токен и получаем информацию о боте
    let botInfo;
    try {
      botInfo = await getTelegramBotInfo(botToken);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid bot token" },
        { status: 400 }
      );
    }

    // Устанавливаем webhook
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/telegram/webhook/${tenantId}`;
    try {
      await setTelegramWebhook(botToken, webhookUrl);
    } catch (error) {
      console.error("[Telegram Webhook Error]", error);
      return NextResponse.json(
        { error: "Failed to set webhook" },
        { status: 500 }
      );
    }

    // Создаем или обновляем бота в БД
    const bot = await prisma.telegramBot.upsert({
      where: {
        tenantId,
      },
      create: {
        tenantId,
        botToken,
        botUsername: botInfo.username,
        groupChatId: groupChatId || null,
        notifyOnNewTicket: notifyOnNewTicket ?? true,
        notifyOnTicketUpdate: notifyOnTicketUpdate ?? true,
        notifyOnNewComment: notifyOnNewComment ?? true,
      },
      update: {
        botToken,
        botUsername: botInfo.username,
        groupChatId: groupChatId || null,
        notifyOnNewTicket: notifyOnNewTicket ?? true,
        notifyOnTicketUpdate: notifyOnTicketUpdate ?? true,
        notifyOnNewComment: notifyOnNewComment ?? true,
        isActive: true,
      },
    });

    return NextResponse.json({ bot });
  } catch (error) {
    console.error("[Telegram Bot POST Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/telegram/bot - Удалить Telegram бота
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 400 }
      );
    }

    const bot = await prisma.telegramBot.findFirst({
      where: { tenantId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Удаляем webhook
    try {
      await deleteTelegramWebhook(bot.botToken);
    } catch (error) {
      console.error("[Telegram Webhook Delete Error]", error);
    }

    // Удаляем бота из БД
    await prisma.telegramBot.delete({
      where: { id: bot.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Telegram Bot DELETE Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

