/**
 * Webhook event delivery system with retry mechanism
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
 * Creates HMAC signature for payload
 */
function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Sends webhook request
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

    // Add signature if secret exists
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
 * Delivers webhook with retry mechanism
 */
async function deliverWebhook(webhookId: string, event: string, payload: any): Promise<void> {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) {
      return;
    }

    // Create delivery record
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

    // Attempt delivery
    const result = await sendWebhookRequest(
      webhook.url,
      webhookPayload,
      webhook.secret || undefined,
      webhook.headers as Record<string, string> | undefined
    );

    // Update delivery record
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

    // Update webhook statistics
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

      // If retries left, schedule retry (can use queues)
      if (delivery.retriesLeft > 0) {
        console.log(`[Webhook] Scheduled retry for delivery ${delivery.id}, retries left: ${delivery.retriesLeft}`);
        // TODO: Add to queue for retry via BullMQ/Redis
      }
    }

    console.log(`[Webhook] Delivery ${delivery.id} completed: ${result.success ? "SUCCESS" : "FAILED"}`);
  } catch (error: any) {
    console.error(`[Webhook] Error delivering webhook ${webhookId}:`, error);
  }
}

/**
 * Triggers webhooks for specific event
 */
export async function triggerWebhooks(event: WebhookEvent, tenantId: string, payload: any): Promise<void> {
  try {
    // Find all active webhooks for this event
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

    // Send webhooks in parallel (don't block main thread)
    const deliveryPromises = webhooks.map((webhook) => deliverWebhook(webhook.id, event, payload));
    
    // Fire and forget - don't wait for completion
    Promise.all(deliveryPromises).catch((error) => {
      console.error("[Webhook] Error in parallel webhook delivery:", error);
    });
  } catch (error: any) {
    console.error("[Webhook] Error triggering webhooks:", error);
  }
}

/**
 * Retries failed deliveries (can be called via cron)
 */
export async function retryFailedDeliveries(): Promise<void> {
  try {
    // Find all deliveries with remaining retries
    const failedDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        retriesLeft: { gt: 0 },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      include: {
        webhook: true,
      },
      take: 100, // Limit batch size
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

