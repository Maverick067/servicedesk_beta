import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { PlanType } from '@prisma/client';

/**
 * POST /api/billing/checkout - Создать Stripe Checkout Session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body as { plan: PlanType };

    if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Проверяем права доступа
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'TENANT_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only tenant admins can manage subscriptions' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Получаем текущую подписку
    const currentSub = await prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });

    // Цены в центах
    const priceMap = {
      PRO: 4900, // $49/month
      ENTERPRISE: 19900, // $199/month
    };

    const price = priceMap[plan];

    // Создаем Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `OnPoints.it ${plan} Plan`,
              description: `Subscription for ${user.tenant?.name}`,
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: user.tenantId,
        plan,
        userId: user.id,
      },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Billing API] Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

