/**
 * Утилиты для проверки лимитов подписки
 */

import { prisma } from './prisma';
import { PlanType } from '@prisma/client';
import { getPlanLimits } from './stripe';

/**
 * Проверить лимит пользователей
 */
export async function checkUserLimit(tenantId: string): Promise<{ allowed: boolean; message?: string }> {
  // Получаем подписку
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    // Нет подписки - используем FREE план
    const limits = getPlanLimits(PlanType.FREE);
    const userCount = await prisma.user.count({
      where: { tenantId },
    });

    if (userCount >= limits.maxUsers) {
      return {
        allowed: false,
        message: `Достигнут лимит пользователей для плана FREE (${limits.maxUsers}). Обновите план для добавления новых пользователей.`,
      };
    }

    return { allowed: true };
  }

  // Проверяем лимит для текущего плана
  const userCount = await prisma.user.count({
    where: { tenantId },
  });

  if (userCount >= subscription.maxUsers) {
    return {
      allowed: false,
      message: `Достигнут лимит пользователей для плана ${subscription.plan} (${subscription.maxUsers}). Обновите план для добавления новых пользователей.`,
    };
  }

  return { allowed: true };
}

/**
 * Проверить лимит агентов
 */
export async function checkAgentLimit(tenantId: string): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    // FREE план
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
        message: `Достигнут лимит агентов для плана FREE (${limits.maxAgents}). Обновите план для добавления новых агентов.`,
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
      message: `Достигнут лимит агентов для плана ${subscription.plan} (${subscription.maxAgents}). Обновите план для добавления новых агентов.`,
    };
  }

  return { allowed: true };
}

/**
 * Проверить лимит хранилища
 */
export async function checkStorageLimit(tenantId: string, additionalSizeGB: number): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  const maxStorageGB = subscription ? subscription.maxStorageGB : getPlanLimits(PlanType.FREE).maxStorageGB;

  // Получаем текущее использование хранилища
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
      message: `Достигнут лимит хранилища (${maxStorageGB}GB). Текущее использование: ${currentStorageGB.toFixed(2)}GB. Обновите план для увеличения хранилища.`,
    };
  }

  return { allowed: true };
}

/**
 * Проверить лимит тикетов за месяц
 */
export async function checkTicketLimit(tenantId: string): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  const maxTicketsPerMonth = subscription ? subscription.maxTicketsPerMonth : getPlanLimits(PlanType.FREE).maxTicketsPerMonth;

  // Если лимит не установлен (null) - unlimited
  if (!maxTicketsPerMonth) {
    return { allowed: true };
  }

  // Считаем тикеты за текущий месяц
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
      message: `Достигнут лимит тикетов за месяц (${maxTicketsPerMonth}). Обновите план для создания новых тикетов.`,
    };
  }

  return { allowed: true };
}

/**
 * Проверить, доступна ли функция для текущего плана
 */
export async function checkFeatureAccess(tenantId: string, feature: 'sso' | 'customDomain' | 'api' | 'prioritySupport' | 'customBranding'): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    return false; // FREE plan не имеет дополнительных функций
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
 * Получить текущее использование ресурсов
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
 * Получить лимиты для текущей подписки
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

