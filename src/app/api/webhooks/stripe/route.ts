/**
 * Stripe Webhook Handler
 * Обрабатывает события от Stripe (подписки, платежи, счета)
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-log';

// Отключаем body parser для webhook
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe - Обработка Stripe webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Получаем сырое тело запроса
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Проверяем подпись и получаем событие
    let event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Обрабатываем разные типы событий
    switch (event.type) {
      // ========== CHECKOUT SESSION ==========
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan as PlanType;

        if (!tenantId || !plan) {
          console.error('[Stripe Webhook] Missing tenantId or plan in metadata');
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Создаём подписку в базе данных
        await prisma.subscription.upsert({
          where: { tenantId },
          update: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            currentPeriodStart: new Date(session.subscription_data?.current_period_start * 1000),
            currentPeriodEnd: new Date(session.subscription_data?.current_period_end * 1000),
          },
          create: {
            tenantId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          },
        });

        await createAuditLog({
          tenantId,
          userId: null,
          action: 'subscription.created',
          resourceType: 'subscription',
          resourceId: session.subscription as string,
          metadata: { plan, stripeCustomerId: session.customer },
          ipAddress: null,
          userAgent: null,
        });

        console.log(`[Stripe Webhook] Subscription created for tenant: ${tenantId}`);
        break;
      }

      // ========== SUBSCRIPTION EVENTS ==========
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenantId;

        if (!tenantId) {
          console.error('[Stripe Webhook] Missing tenantId in subscription metadata');
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Маппинг статусов Stripe -> наши статусы
        const statusMap: Record<string, SubscriptionStatus> = {
          active: SubscriptionStatus.ACTIVE,
          trialing: SubscriptionStatus.TRIALING,
          past_due: SubscriptionStatus.PAST_DUE,
          canceled: SubscriptionStatus.CANCELED,
          incomplete: SubscriptionStatus.INCOMPLETE,
          unpaid: SubscriptionStatus.UNPAID,
        };

        const status = statusMap[subscription.status] || SubscriptionStatus.ACTIVE;

        await prisma.subscription.upsert({
          where: { tenantId },
          update: {
            status,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price?.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          },
          create: {
            tenantId,
            plan: PlanType.PRO, // Default plan
            status,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price?.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          },
        });

        await createAuditLog({
          tenantId,
          userId: null,
          action: event.type === 'customer.subscription.created' ? 'subscription.created' : 'subscription.updated',
          resourceType: 'subscription',
          resourceId: subscription.id,
          metadata: { status: subscription.status },
          ipAddress: null,
          userAgent: null,
        });

        console.log(`[Stripe Webhook] Subscription ${event.type} for tenant: ${tenantId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenantId;

        if (!tenantId) {
          console.error('[Stripe Webhook] Missing tenantId in subscription metadata');
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        await prisma.subscription.update({
          where: { tenantId },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
          },
        });

        await createAuditLog({
          tenantId,
          userId: null,
          action: 'subscription.deleted',
          resourceType: 'subscription',
          resourceId: subscription.id,
          metadata: {},
          ipAddress: null,
          userAgent: null,
        });

        console.log(`[Stripe Webhook] Subscription deleted for tenant: ${tenantId}`);
        break;
      }

      // ========== INVOICE EVENTS ==========
      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        // Находим подписку по stripeSubscriptionId
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (!subscription) {
          console.error('[Stripe Webhook] Subscription not found for invoice');
          return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Создаём запись о счёте
        await prisma.invoice.upsert({
          where: { stripeInvoiceId: invoice.id },
          update: {
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            status: invoice.status,
            paidAt: new Date(invoice.status_transitions.paid_at * 1000),
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
          },
          create: {
            subscriptionId: subscription.id,
            stripeInvoiceId: invoice.id,
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status,
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
            dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
            paidAt: new Date(invoice.status_transitions.paid_at * 1000),
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
          },
        });

        await createAuditLog({
          tenantId: subscription.tenantId,
          userId: null,
          action: 'invoice.paid',
          resourceType: 'invoice',
          resourceId: invoice.id,
          metadata: { amount: invoice.amount_paid, currency: invoice.currency },
          ipAddress: null,
          userAgent: null,
        });

        console.log(`[Stripe Webhook] Invoice paid for subscription: ${subscriptionId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        // Находим подписку
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (!subscription) {
          console.error('[Stripe Webhook] Subscription not found for invoice');
          return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Обновляем статус подписки
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.PAST_DUE,
          },
        });

        await createAuditLog({
          tenantId: subscription.tenantId,
          userId: null,
          action: 'invoice.payment_failed',
          resourceType: 'invoice',
          resourceId: invoice.id,
          metadata: { amount: invoice.amount_due, currency: invoice.currency },
          ipAddress: null,
          userAgent: null,
        });

        console.log(`[Stripe Webhook] Invoice payment failed for subscription: ${subscriptionId}`);
        break;
      }

      // ========== PAYMENT EVENTS ==========
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        console.log(`[Stripe Webhook] Payment intent succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        console.log(`[Stripe Webhook] Payment intent failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

