/**
 * Stripe integration для billing
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

/**
 * ID цен Stripe для каждого плана
 */
export const STRIPE_PLANS = {
  FREE: {
    priceId: process.env.STRIPE_PRICE_FREE || '',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      '10 пользователей',
      '2 агента',
      '1GB хранилища',
      'Базовые тикеты',
      'Email поддержка',
    ],
    limits: {
      maxUsers: 10,
      maxAgents: 2,
      maxStorageGB: 1,
      maxTicketsPerMonth: 100,
    },
  },
  PRO: {
    priceId: process.env.STRIPE_PRICE_PRO || '',
    name: 'Pro',
    price: 49,
    currency: 'usd',
    interval: 'month',
    features: [
      '50 пользователей',
      '15 агентов',
      '20GB хранилища',
      'SLA policies',
      'База знаний',
      'IT активы (CMDB)',
      'Автоматизация',
      'Приоритетная поддержка',
    ],
    limits: {
      maxUsers: 50,
      maxAgents: 15,
      maxStorageGB: 20,
      maxTicketsPerMonth: null, // Unlimited
    },
  },
  ENTERPRISE: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    name: 'Enterprise',
    price: 199,
    currency: 'usd',
    interval: 'month',
    features: [
      'Неограниченно пользователей',
      'Неограниченно агентов',
      'Custom хранилище',
      'Все модули',
      'SSO (OIDC, SAML, LDAP)',
      'Кастомный домен',
      'API доступ',
      'Кастомный брендинг',
      '24/7 поддержка',
      'SLA 99.9%',
    ],
    limits: {
      maxUsers: 999999,
      maxAgents: 999999,
      maxStorageGB: 1000,
      maxTicketsPerMonth: null, // Unlimited
    },
  },
} as const;

/**
 * Получить лимиты для плана
 */
export function getPlanLimits(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return STRIPE_PLANS[plan].limits;
}

/**
 * Получить информацию о плане
 */
export function getPlanInfo(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return STRIPE_PLANS[plan];
}

/**
 * Создать Stripe Checkout Session
 */
export async function createCheckoutSession({
  tenantId,
  plan,
  successUrl,
  cancelUrl,
  customerEmail,
}: {
  tenantId: string;
  plan: 'PRO' | 'ENTERPRISE';
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}) {
  const planInfo = STRIPE_PLANS[plan];

  if (!planInfo.priceId) {
    throw new Error(`Stripe Price ID not configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: planInfo.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    metadata: {
      tenantId,
      plan,
    },
    subscription_data: {
      metadata: {
        tenantId,
        plan,
      },
      trial_period_days: 14, // 14 дней триала
    },
  });

  return session;
}

/**
 * Создать Stripe Portal Session (для управления подпиской)
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Получить информацию о подписке из Stripe
 */
export async function getStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Отменить подписку
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Возобновить подписку
 */
export async function resumeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Получить список счетов
 */
export async function getInvoices(customerId: string, limit = 10) {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Создать usage record (для метрик)
 */
export async function createUsageRecord({
  subscriptionItemId,
  quantity,
  timestamp,
}: {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: number;
}) {
  const usageRecord = await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'set',
    }
  );

  return usageRecord;
}

/**
 * Проверить, что webhook от Stripe
 */
export function constructWebhookEvent(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }

  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  return event;
}

