import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, TelegramUpdate } from "@/lib/telegram";

/**
 * POST /api/telegram/webhook/[tenantId] - Telegram Bot Webhook
 * 
 * Этот endpoint получает обновления от Telegram Bot API.
 * Каждый tenant имеет свой уникальный webhook URL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    // Получаем настройки бота для этого tenant
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

    // Парсим update от Telegram
    const update: TelegramUpdate = await req.json();

    // Обрабатываем только текстовые сообщения
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;
    const userId = message.from.id;

    // Сохраняем пользователя Telegram, если его еще нет
    await prisma.telegramUser.upsert({
      where: {
        telegramId_botId: {
          telegramId: userId.toString(),
          botId: bot.id,
        },
      },
      create: {
        telegramId: userId.toString(),
        botId: bot.id,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        username: message.from.username,
        chatId: chatId.toString(),
      },
      update: {
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        username: message.from.username,
        chatId: chatId.toString(),
      },
    });

    // Сохраняем сообщение
    await prisma.telegramMessage.create({
      data: {
        botId: bot.id,
        messageId: message.message_id.toString(),
        chatId: chatId.toString(),
        fromUserId: userId.toString(),
        text: text,
        messageType: "text",
      },
    });

    // Обработка команд
    if (text.startsWith("/")) {
      return await handleCommand(bot.id, bot.botToken, chatId, text, message);
    }

    // Если сообщение не команда, показываем help
    await sendTelegramMessage(
      bot.botToken,
      chatId,
      "Используйте /help для списка доступных команд."
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
 * Обработка команд Telegram
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
        `Привет, ${message.from.first_name}! 👋\n\nЯ бот для управления тикетами.\n\nДоступные команды:\n/help - Список команд\n/ticket - Создать тикет\n/link - Привязать аккаунт`
      );
      break;

    case "/help":
      await sendTelegramMessage(
        botToken,
        chatId,
        `📋 *Доступные команды:*\n\n/start - Начать работу\n/ticket - Создать новый тикет\n/link - Привязать Telegram к аккаунту\n/status - Проверить статус\n/help - Показать эту справку`,
        { parse_mode: "Markdown" }
      );
      break;

    case "/ticket":
      // Парсим команду: /ticket Название - Описание
      const ticketMatch = text.match(/^\/ticket\s+(.+?)\s+-\s+(.+)$/s);
      
      if (!ticketMatch) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "🎫 *Создание тикета*\n\nДля создания тикета через Telegram, отправьте сообщение в формате:\n\n`/ticket [Название] - [Описание]`\n\nПример:\n`/ticket Не работает почта - Не могу отправить письмо`",
          { parse_mode: "Markdown" }
        );
        break;
      }

      const [, ticketTitle, ticketDescription] = ticketMatch;

      // Проверяем, привязан ли Telegram к пользователю
      const telegramUser = await prisma.telegramUser.findFirst({
        where: {
          telegramId: message.from.id.toString(),
          botId,
        },
        include: {
          user: {
            select: {
              id: true,
              tenantId: true,
            },
          },
        },
      });

      if (!telegramUser?.userId) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `❌ Ваш Telegram не привязан к аккаунту.\n\nИспользуйте /link для получения инструкций.`,
          { parse_mode: "Markdown" }
        );
        break;
      }

      // Получаем tenant для генерации номера тикета
      const tenant = await prisma.tenant.findUnique({
        where: { id: telegramUser.user!.tenantId! },
        select: { slug: true, name: true },
      });

      if (!tenant) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "❌ Ошибка: организация не найдена."
        );
        break;
      }

      // Генерируем номер тикета
      const ticketCount = await prisma.ticket.count({
        where: { tenantId: telegramUser.user!.tenantId! },
      });
      const ticketNumber = `${tenant.slug.toUpperCase()}-${String(ticketCount + 1).padStart(3, "0")}`;

      // Создаем тикет
      const newTicket = await prisma.ticket.create({
        data: {
          number: ticketNumber,
          title: ticketTitle.trim(),
          description: ticketDescription.trim(),
          status: "OPEN",
          priority: "MEDIUM",
          tenantId: telegramUser.user!.tenantId!,
          creatorId: telegramUser.user!.id,
        },
      });

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ Тикет успешно создан!\n\n*Номер:* ${ticketNumber}\n*Название:* ${ticketTitle.trim()}\n*Статус:* Открыт`,
        { parse_mode: "Markdown" }
      );

      // Если настроена группа для уведомлений агентов, отправляем туда
      const bot = await prisma.telegramBot.findUnique({
        where: { id: botId },
        select: { groupChatId: true, notifyOnNewTicket: true },
      });

      if (bot?.groupChatId && bot.notifyOnNewTicket) {
        await sendTelegramMessage(
          botToken,
          bot.groupChatId,
          `🎫 *Новый тикет: ${ticketNumber}*\n\n*Название:* ${ticketTitle.trim()}\n*Описание:* ${ticketDescription.trim()}\n*Создатель:* ${message.from.first_name}`,
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
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (linkTelegramUser?.userId) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `✅ Ваш Telegram уже привязан к аккаунту:\n*${linkTelegramUser.user?.name}* (${linkTelegramUser.user?.email})`,
          { parse_mode: "Markdown" }
        );
      } else {
        await sendTelegramMessage(
          botToken,
          chatId,
          `🔗 Для привязки Telegram к аккаунту:\n\n1. Зайдите в веб-интерфейс\n2. Перейдите в Настройки → Telegram\n3. Введите ваш Telegram ID: \`${message.from.id}\``,
          { parse_mode: "Markdown" }
        );
      }
      break;

    case "/status":
      await sendTelegramMessage(
        botToken,
        chatId,
        "✅ Бот работает нормально!"
      );
      break;

    default:
      await sendTelegramMessage(
        botToken,
        chatId,
        "❌ Неизвестная команда. Используйте /help для списка доступных команд."
      );
  }

  return NextResponse.json({ ok: true });
}

