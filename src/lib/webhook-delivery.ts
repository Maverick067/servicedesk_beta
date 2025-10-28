/**
 * Система доставки webhook событий с retry механизмом
 */

import { prisma } from "./prisma";
import crypto from "crypto";

type WebhookEvent = "TICKET_CREATED" | "TICKET_UPDATED" | "TICKET_RESOLVED" | "TICKET_CLOSED" | "COMMENT_ADDED" | "USER_CREATED" | "CATEGORY_CREATED" | "ALL";

interface WebhookPayload {
  event: string;
  timestamp: Date;
  tenantId: string;
  data: any;
}

/**
 * Создаёт подпись HMAC для payload
 */
function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Отправляет webhook запрос
 */
async function sendWebhookRequest(url: string, payload: WebhookPayload, secret?: string, headers?: Record<string, string>): Promise<{ success: boolean; statusCode?: number; response?: string; error?: string; duration: number }> {
  const startTime = Date.now();
  
  try {
    const payloadString = JSON.stringify(payload);
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "ServiceDesk-Webhooks/1.0",
      ...(headers || {}),
    };

    // Добавляем подпись если есть secret
    if (secret) {
      requestHeaders["X-Webhook-Signature"] = createSignature(payloadString, secret);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();

    if (response.ok) {
      return { success: true, statusCode: response.status, response: responseText, duration };
    } else {
      return { success: false, statusCode: response.status, response: responseText, error: `HTTP ${response.status}`, duration };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return { success: false, error: error.message, duration };
  }
}

/**
 * Доставляет webhook с retry механизмом
 */
async function deliverWebhook(webhookId: string, event: string, payload: any): Promise<void> {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) {
      return;
    }

    // Создаём запись о доставке
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        retriesLeft: 3,
      },
    });

    const webhookPayload: WebhookPayload = {
      event,
      timestamp: new Date(),
      tenantId: webhook.tenantId,
      data: payload,
    };

    // Попытка отправки
    const result = await sendWebhookRequest(
      webhook.url,
      webhookPayload,
      webhook.secret || undefined,
      webhook.headers as Record<string, string> | undefined
    );

    // Обновляем запись о доставке
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        statusCode: result.statusCode,
        response: result.response,
        error: result.error,
        duration: result.duration,
        retriesLeft: result.success ? 0 : 2,
      },
    });

    // Обновляем статистику webhook
    if (result.success) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          successCount: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      });
    } else {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: { increment: 1 },
          lastError: result.error || "Unknown error",
          lastTriggeredAt: new Date(),
        },
      });

      // Если есть ретраи, планируем повторную попытку (можно использовать очереди)
      if (delivery.retriesLeft > 0) {
        console.log(`[Webhook] Scheduled retry for delivery ${delivery.id}, retries left: ${delivery.retriesLeft}`);
        // TODO: Добавить в очередь для повторной отправки через BullMQ/Redis
      }
    }

    console.log(`[Webhook] Delivery ${delivery.id} completed: ${result.success ? "SUCCESS" : "FAILED"}`);
  } catch (error: any) {
    console.error(`[Webhook] Error delivering webhook ${webhookId}:`, error);
  }
}

/**
 * Триггерит webhooks для определённого события
 */
export async function triggerWebhooks(event: WebhookEvent, tenantId: string, payload: any): Promise<void> {
  try {
    // Находим все активные webhooks для данного события
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { events: { has: event } },
          { events: { has: "ALL" } },
        ],
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    console.log(`[Webhook] Triggering ${webhooks.length} webhooks for event ${event}`);

    // Отправляем webhooks параллельно (не блокируем основной поток)
    const deliveryPromises = webhooks.map((webhook) => deliverWebhook(webhook.id, event, payload));
    
    // Fire and forget - не ждём завершения
    Promise.all(deliveryPromises).catch((error) => {
      console.error("[Webhook] Error in parallel webhook delivery:", error);
    });
  } catch (error: any) {
    console.error("[Webhook] Error triggering webhooks:", error);
  }
}

/**
 * Повторяет неудавшиеся доставки (можно вызывать по cron)
 */
export async function retryFailedDeliveries(): Promise<void> {
  try {
    // Находим все доставки с оставшимися ретраями
    const failedDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        retriesLeft: { gt: 0 },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      include: {
        webhook: true,
      },
      take: 100, // Ограничиваем количество за раз
    });

    console.log(`[Webhook] Retrying ${failedDeliveries.length} failed deliveries`);

    for (const delivery of failedDeliveries) {
      if (!delivery.webhook || !delivery.webhook.isActive) {
        continue;
      }

      const webhookPayload: WebhookPayload = {
        event: delivery.event,
        timestamp: new Date(),
        tenantId: delivery.webhook.tenantId,
        data: delivery.payload,
      };

      const result = await sendWebhookRequest(
        delivery.webhook.url,
        webhookPayload,
        delivery.webhook.secret || undefined,
        delivery.webhook.headers as Record<string, string> | undefined
      );

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          statusCode: result.statusCode,
          response: result.response,
          error: result.error,
          duration: result.duration,
          retriesLeft: result.success ? 0 : Math.max(0, delivery.retriesLeft - 1),
        },
      });

      if (result.success) {
        await prisma.webhook.update({
          where: { id: delivery.webhook.id },
          data: { successCount: { increment: 1 } },
        });
      }
    }
  } catch (error: any) {
    console.error("[Webhook] Error retrying failed deliveries:", error);
  }
}

