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
 * GET /api/telegram/bot - Get Telegram bot settings
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

    // Only TENANT_ADMIN and ADMIN can manage bot
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

    // For global ADMIN without tenantId - return empty result
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
 * POST /api/telegram/bot - Create/update Telegram bot
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

    // Check token and get bot information
    let botInfo;
    try {
      botInfo = await getTelegramBotInfo(botToken);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid bot token" },
        { status: 400 }
      );
    }

    // Set webhook
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

    // Create or update bot in database
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
 * DELETE /api/telegram/bot - Delete Telegram bot
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

    // Delete webhook
    try {
      await deleteTelegramWebhook(bot.botToken);
    } catch (error) {
      console.error("[Telegram Webhook Delete Error]", error);
    }

    // Delete bot from database
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

