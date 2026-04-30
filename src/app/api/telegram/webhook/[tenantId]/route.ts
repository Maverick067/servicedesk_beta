import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, TelegramUpdate } from "@/lib/telegram";

/**
 * POST /api/telegram/webhook/[tenantId] - Telegram Bot Webhook
 * 
 * This endpoint receives updates from Telegram Bot API.
 * Each tenant has its own unique webhook URL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    // Get bot settings for this tenant
    const bot = await prisma.telegramBot.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    });

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found or inactive" },
        { status: 404 }
      );
    }

    // Parse update from Telegram
    const update: TelegramUpdate = await req.json();

    // Process only text messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text ?? "";
    const userId = message.from.id;

    // Save Telegram user if not exists
    await prisma.telegramUser.upsert({
      where: {
        botId_telegramId: {
          botId: bot.id,
          telegramId: userId.toString(),
        },
      },
      create: {
        telegramId: userId.toString(),
        botId: bot.id,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        telegramUsername: message.from.username,
        // Store deterministic placeholder to satisfy required schema field.
        // Real ServiceDesk user id must be written during account linking.
        userId: `telegram:${userId}`,
      },
      update: {
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        telegramUsername: message.from.username,
      },
    });

    // Save message
    await prisma.telegramMessage.create({
      data: {
        botId: bot.id,
        telegramMessageId: message.message_id.toString(),
        telegramChatId: chatId.toString(),
        text: text,
        messageType: "text",
        direction: "incoming",
      },
    });

    // Handle commands
    if (text.startsWith("/")) {
      return await handleCommand(bot.id, bot.botToken, chatId, text, message);
    }

    // If message is not a command, show help
    await sendTelegramMessage(
      bot.botToken,
      chatId,
      "Use /help for a list of available commands."
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle Telegram commands
 */
async function handleCommand(
  botId: string,
  botToken: string,
  chatId: number,
  text: string,
  message: any
): Promise<NextResponse> {
  const command = text.split(" ")[0].toLowerCase();

  switch (command) {
    case "/start":
      await sendTelegramMessage(
        botToken,
        chatId,
        `Hello, ${message.from.first_name}! 👋\n\nI'm a ticket management bot.\n\nAvailable commands:\n/help - List commands\n/ticket - Create ticket\n/link - Link account`
      );
      break;

    case "/help":
      await sendTelegramMessage(
        botToken,
        chatId,
        `📋 *Available commands:*\n\n/start - Start working\n/ticket - Create new ticket\n/link - Link Telegram to account\n/status - Check status\n/help - Show this help`,
        { parse_mode: "Markdown" }
      );
      break;

    case "/ticket":
      // Parse command: /ticket Title - Description
      const ticketMatch = text.match(/^\/ticket\s+([\s\S]+?)\s+-\s+([\s\S]+)$/);
      
      if (!ticketMatch) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "🎫 *Create Ticket*\n\nTo create a ticket via Telegram, send a message in the format:\n\n`/ticket [Title] - [Description]`\n\nExample:\n`/ticket Email not working - Cannot send email`",
          { parse_mode: "Markdown" }
        );
        break;
      }

      const [, ticketTitle, ticketDescription] = ticketMatch;

      // Check if Telegram is linked to user
      const telegramUser = await prisma.telegramUser.findFirst({
        where: {
          telegramId: message.from.id.toString(),
          botId,
        },
      });

      if (
        !telegramUser?.isVerified ||
        !telegramUser.userId ||
        telegramUser.userId.startsWith("telegram:")
      ) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `❌ Your Telegram is not linked to an account.\n\nUse /link for instructions.`,
          { parse_mode: "Markdown" }
        );
        break;
      }

      const botRecord = await prisma.telegramBot.findUnique({
        where: { id: botId },
        select: { tenantId: true },
      });

      if (!botRecord?.tenantId) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "❌ Error: bot configuration not found."
        );
        break;
      }

      // Get tenant for ticket number generation
      const tenant = await prisma.tenant.findUnique({
        where: { id: botRecord.tenantId },
        select: { slug: true, name: true },
      });

      if (!tenant) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "❌ Error: organization not found."
        );
        break;
      }

      // Generate ticket number
      const ticketCount = await prisma.ticket.count({
        where: { tenantId: botRecord.tenantId },
      });
      const nextTicketNumber = ticketCount + 1;
      const ticketCode = `${tenant.slug.toUpperCase()}-${String(nextTicketNumber).padStart(3, "0")}`;

      // Create ticket
      await prisma.ticket.create({
        data: {
          number: nextTicketNumber,
          title: ticketTitle.trim(),
          description: ticketDescription.trim(),
          status: "OPEN",
          priority: "MEDIUM",
          tenantId: botRecord.tenantId,
          creatorId: telegramUser.userId,
        },
      });

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ Ticket created successfully!\n\n*Number:* ${ticketCode}\n*Title:* ${ticketTitle.trim()}\n*Status:* Open`,
        { parse_mode: "Markdown" }
      );

      // If agent notification group is configured, send there
      const botSettings = await prisma.telegramBot.findUnique({
        where: { id: botId },
        select: { groupChatId: true, notifyOnNewTicket: true },
      });

      if (botSettings?.groupChatId && botSettings.notifyOnNewTicket) {
        await sendTelegramMessage(
          botToken,
          botSettings.groupChatId,
          `🎫 *New Ticket: ${ticketCode}*\n\n*Title:* ${ticketTitle.trim()}\n*Description:* ${ticketDescription.trim()}\n*Creator:* ${message.from.first_name}`,
          { parse_mode: "Markdown" }
        );
      }
      break;

    case "/link":
      const linkTelegramUser = await prisma.telegramUser.findFirst({
        where: {
          telegramId: message.from.id.toString(),
          botId,
        },
      });

      if (
        linkTelegramUser?.isVerified &&
        linkTelegramUser.userId &&
        !linkTelegramUser.userId.startsWith("telegram:")
      ) {
        const linkedUser = await prisma.user.findUnique({
          where: { id: linkTelegramUser.userId },
          select: { name: true, email: true },
        });
        await sendTelegramMessage(
          botToken,
          chatId,
          `✅ Your Telegram is already linked to account:\n*${linkedUser?.name || "Unknown"}* (${linkedUser?.email || "unknown"})`,
          { parse_mode: "Markdown" }
        );
      } else {
        await sendTelegramMessage(
          botToken,
          chatId,
          `🔗 To link Telegram to account:\n\n1. Go to web interface\n2. Navigate to Settings → Telegram\n3. Enter your Telegram ID: \`${message.from.id}\``,
          { parse_mode: "Markdown" }
        );
      }
      break;

    case "/status":
      await sendTelegramMessage(
        botToken,
        chatId,
        "✅ Bot is working normally!"
      );
      break;

    default:
      await sendTelegramMessage(
        botToken,
        chatId,
        "❌ Unknown command. Use /help for a list of available commands."
      );
  }

  return NextResponse.json({ ok: true });
}

