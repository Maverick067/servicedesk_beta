/**
 * Utilities for checking subscription limits
 */

import { prisma } from './prisma';
import { PlanType } from '@prisma/client';
import { getPlanLimits } from './stripe';

/**
 * Check user limit
 */
export async function checkUserLimit(tenantId: string): Promise<{ allowed: boolean; message?: string }> {
  // Get subscription
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    // No subscription - use FREE plan
    const limits = getPlanLimits(PlanType.FREE);
    const userCount = await prisma.user.count({
      where: { tenantId },
    });

    if (userCount >= limits.maxUsers) {
      return {
        allowed: false,
        message: `User limit reached for FREE plan (${limits.maxUsers}). Upgrade plan to add new users.`,
      };
    }

    return { allowed: true };
  }

  // Check limit for current plan
  const userCount = await prisma.user.count({
    where: { tenantId },
  });

  if (userCount >= subscription.maxUsers) {
    return {
      allowed: false,
      message: `User limit reached for ${subscription.plan} plan (${subscription.maxUsers}). Upgrade plan to add new users.`,
    };
  }

  return { allowed: true };
}

/**
 * Check agent limit
 */
export async function checkAgentLimit(tenantId: string): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    // FREE plan
    const limits = getPlanLimits(PlanType.FREE);
    const agentCount = await prisma.user.count({
      where: {
        tenantId,
        role: { in: ['AGENT', 'TENANT_ADMIN'] },
      },
    });

    if (agentCount >= limits.maxAgents) {
      return {
        allowed: false,
        message: `Agent limit reached for FREE plan (${limits.maxAgents}). Upgrade plan to add new agents.`,
      };
    }

    return { allowed: true };
  }

  const agentCount = await prisma.user.count({
    where: {
      tenantId,
      role: { in: ['AGENT', 'TENANT_ADMIN'] },
    },
  });

  if (agentCount >= subscription.maxAgents) {
    return {
      allowed: false,
      message: `Agent limit reached for ${subscription.plan} plan (${subscription.maxAgents}). Upgrade plan to add new agents.`,
    };
  }

  return { allowed: true };
}

/**
 * Check storage limit
 */
export async function checkStorageLimit(tenantId: string, additionalSizeGB: number): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  const maxStorageGB = subscription ? subscription.maxStorageGB : getPlanLimits(PlanType.FREE).maxStorageGB;

  // Get current storage usage
  const currentStorageBytes = await prisma.attachment.aggregate({
    where: {
      ticket: { tenantId },
    },
    _sum: {
      size: true,
    },
  });

  const currentStorageGB = (currentStorageBytes._sum.size || 0) / (1024 * 1024 * 1024);

  if (currentStorageGB + additionalSizeGB > maxStorageGB) {
    return {
      allowed: false,
      message: `Storage limit reached (${maxStorageGB}GB). Current usage: ${currentStorageGB.toFixed(2)}GB. Upgrade plan to increase storage.`,
    };
  }

  return { allowed: true };
}

/**
 * Check monthly ticket limit
 */
export async function checkTicketLimit(tenantId: string): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  const maxTicketsPerMonth = subscription ? subscription.maxTicketsPerMonth : getPlanLimits(PlanType.FREE).maxTicketsPerMonth;

  // If limit not set (null) - unlimited
  if (!maxTicketsPerMonth) {
    return { allowed: true };
  }

  // Count tickets for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const ticketCount = await prisma.ticket.count({
    where: {
      tenantId,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  if (ticketCount >= maxTicketsPerMonth) {
    return {
      allowed: false,
      message: `Monthly ticket limit reached (${maxTicketsPerMonth}). Upgrade plan to create new tickets.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if feature is available for current plan
 */
export async function checkFeatureAccess(tenantId: string, feature: 'sso' | 'customDomain' | 'api' | 'prioritySupport' | 'customBranding'): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    return false; // FREE plan does not have additional features
  }

  const featureMap: Record<string, keyof typeof subscription> = {
    sso: 'ssoEnabled',
    customDomain: 'customDomainEnabled',
    api: 'apiAccessEnabled',
    prioritySupport: 'prioritySupportEnabled',
    customBranding: 'customBrandingEnabled',
  };

  const field = featureMap[feature];
  return subscription[field] as boolean;
}

/**
 * Get current resource usage
 */
export async function getUsageStats(tenantId: string) {
  const [userCount, agentCount, storageBytes, ticketCountThisMonth] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, role: { in: ['AGENT', 'TENANT_ADMIN'] } } }),
    prisma.attachment.aggregate({
      where: { ticket: { tenantId } },
      _sum: { size: true },
    }),
    prisma.ticket.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const storageGB = (storageBytes._sum.size || 0) / (1024 * 1024 * 1024);

  return {
    users: userCount,
    agents: agentCount,
    storageGB,
    ticketsThisMonth: ticketCountThisMonth,
  };
}

/**
 * Get limits for current subscription
 */
export async function getSubscriptionLimits(tenantId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    return getPlanLimits(PlanType.FREE);
  }

  return {
    maxUsers: subscription.maxUsers,
    maxAgents: subscription.maxAgents,
    maxStorageGB: subscription.maxStorageGB,
    maxTicketsPerMonth: subscription.maxTicketsPerMonth,
  };
}

