import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/billing/subscription - Получить текущую подписку
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

    // Только TENANT_ADMIN может управлять подпиской
    if (user.role !== 'TENANT_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only tenant admins can manage subscriptions' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Получаем подписку
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });

    return NextResponse.json(subscription || null);
  } catch (error) {
    console.error('[Billing API] Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

