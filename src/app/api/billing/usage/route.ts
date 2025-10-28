import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUsageStats, getSubscriptionLimits } from '@/lib/subscription-limits';

/**
 * GET /api/billing/usage - Получить статистику использования ресурсов
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем права доступа
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Только TENANT_ADMIN может просматривать использование
    if (user.role !== 'TENANT_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only tenant admins can view usage' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Получаем статистику
    const [usage, limits] = await Promise.all([
      getUsageStats(user.tenantId),
      getSubscriptionLimits(user.tenantId),
    ]);

    return NextResponse.json({
      usage,
      limits,
      percentages: {
        users: Math.round((usage.users / limits.maxUsers) * 100),
        agents: Math.round((usage.agents / limits.maxAgents) * 100),
        storage: Math.round((usage.storageGB / limits.maxStorageGB) * 100),
        tickets: limits.maxTicketsPerMonth
          ? Math.round((usage.ticketsThisMonth / limits.maxTicketsPerMonth) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('[Billing API] Error fetching usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

