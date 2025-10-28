import { NextResponse } from 'next/server';
import { register } from '@/lib/metrics';

/**
 * GET /api/metrics - Prometheus metrics endpoint
 */
export async function GET() {
  try {
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

