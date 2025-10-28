/**
 * Telegram Bot API Helper Functions
 */

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
  };
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Отправка сообщения в Telegram
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: "Markdown" | "HTML";
    reply_markup?: any;
  }
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text,
    ...options,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }
}

/**
 * Установка webhook для бота
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: webhookUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram setWebhook error: ${JSON.stringify(error)}`);
  }
}

/**
 * Удаление webhook
 */
export async function deleteTelegramWebhook(botToken: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
  
  const response = await fetch(url, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram deleteWebhook error: ${JSON.stringify(error)}`);
  }
}

/**
 * Получение информации о боте
 */
export async function getTelegramBotInfo(botToken: string): Promise<{
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}> {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  
  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram getMe error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.result;
}

/**
 * Форматирование сообщения о новом тикете
 */
export function formatNewTicketMessage(ticket: {
  number: string;
  title: string;
  description: string;
  priority: string;
  creator: { name: string; email: string };
  tenant: { name: string };
}): string {
  return `
🎫 *Новый тикет: ${ticket.number}*

*Название:* ${ticket.title}
*Приоритет:* ${ticket.priority}
*Создатель:* ${ticket.creator.name} (${ticket.creator.email})
*Организация:* ${ticket.tenant.name}

*Описание:*
${ticket.description}
  `.trim();
}

/**
 * Форматирование сообщения об обновлении тикета
 */
export function formatTicketUpdateMessage(ticket: {
  number: string;
  title: string;
  status: string;
  assignee?: { name: string } | null;
}): string {
  const assigneeText = ticket.assignee 
    ? `*Исполнитель:* ${ticket.assignee.name}`
    : "*Исполнитель:* Не назначен";

  return `
🔄 *Тикет обновлен: ${ticket.number}*

*Название:* ${ticket.title}
*Статус:* ${ticket.status}
${assigneeText}
  `.trim();
}

/**
 * Форматирование сообщения о новом комментарии
 */
export function formatNewCommentMessage(comment: {
  ticket: { number: string; title: string };
  author: { name: string };
  content: string;
}): string {
  return `
💬 *Новый комментарий к ${comment.ticket.number}*

*Автор:* ${comment.author.name}
*Тикет:* ${comment.ticket.title}

*Комментарий:*
${comment.content}
  `.trim();
}

