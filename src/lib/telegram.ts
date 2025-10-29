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
 * Send message to Telegram
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
 * Set webhook for bot
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
 * Delete webhook
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
 * Get bot information
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
 * Format new ticket message
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
🎫 *New Ticket: ${ticket.number}*

*Title:* ${ticket.title}
*Priority:* ${ticket.priority}
*Creator:* ${ticket.creator.name} (${ticket.creator.email})
*Organization:* ${ticket.tenant.name}

*Description:*
${ticket.description}
  `.trim();
}

/**
 * Format ticket update message
 */
export function formatTicketUpdateMessage(ticket: {
  number: string;
  title: string;
  status: string;
  assignee?: { name: string } | null;
}): string {
  const assigneeText = ticket.assignee 
    ? `*Assignee:* ${ticket.assignee.name}`
    : "*Assignee:* Not assigned";

  return `
🔄 *Ticket Updated: ${ticket.number}*

*Title:* ${ticket.title}
*Status:* ${ticket.status}
${assigneeText}
  `.trim();
}

/**
 * Format new comment message
 */
export function formatNewCommentMessage(comment: {
  ticket: { number: string; title: string };
  author: { name: string };
  content: string;
}): string {
  return `
💬 *New Comment on ${comment.ticket.number}*

*Author:* ${comment.author.name}
*Ticket:* ${comment.ticket.title}

*Comment:*
${comment.content}
  `.trim();
}

