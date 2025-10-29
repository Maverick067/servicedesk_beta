/**
 * Stripe integration for billing
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
 * Stripe price IDs for each plan
 */
export const STRIPE_PLANS = {
  FREE: {
    priceId: process.env.STRIPE_PRICE_FREE || '',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      '10 users',
      '2 agents',
      '1GB storage',
      'Basic tickets',
      'Email support',
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
      '50 users',
      '15 agents',
      '20GB storage',
      'SLA policies',
      'Knowledge base',
      'IT assets (CMDB)',
      'Automation',
      'Priority support',
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
      'Unlimited users',
      'Unlimited agents',
      'Custom storage',
      'All modules',
      'SSO (OIDC, SAML, LDAP)',
      'Custom domain',
      'API access',
      'Custom branding',
      '24/7 support',
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
 * Get plan limits
 */
export function getPlanLimits(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return STRIPE_PLANS[plan].limits;
}

/**
 * Get plan information
 */
export function getPlanInfo(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return STRIPE_PLANS[plan];
}

/**
 * Create Stripe Checkout Session
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
      trial_period_days: 14, // 14 days trial
    },
  });

  return session;
}

/**
 * Create Stripe Portal Session (for subscription management)
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
 * Get subscription information from Stripe
 */
export async function getStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Resume subscription
 */
export async function resumeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Get list of invoices
 */
export async function getInvoices(customerId: string, limit = 10) {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Create usage record (for metrics)
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
 * Verify that webhook is from Stripe
 */
export function constructWebhookEvent(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }

  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  return event;
}

