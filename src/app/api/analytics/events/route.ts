import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { publishAnalyticsEvent, subscribeAnalyticsEvents } from '@/lib/cache/analytics-events';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const activeBusinessId = cookieStore.get('dukaanos_active_business_id')?.value;

    const memberships = await prisma.businessMembership.findMany({
      where: { userId: user.id },
      select: { businessId: true },
    });

    const businessIds = new Set(memberships.map((m) => m.businessId));
    if (!activeBusinessId || !businessIds.has(activeBusinessId)) {
      const first = memberships[0];
      if (!first) {
        return NextResponse.json({ error: 'No business access' }, { status: 403 });
      }
      businessIds.add(first.businessId);
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch {
            clearInterval(keepAliveInterval);
            cleanup();
          }
        }, 25000);

        const cleanup = () => {
          clearInterval(keepAliveInterval);
          unsubscribers.forEach((fn) => fn());
          unsubscribers.length = 0;
        };

        const unsubscribers: (() => void)[] = [];
        for (const bid of businessIds) {
          const unsub = subscribeAnalyticsEvents(bid, (event) => {
            const payload = JSON.stringify({ ...event, businessId: bid });
            const chunk = `data: ${payload}\n\n`;
            try {
              controller.enqueue(encoder.encode(chunk));
            } catch {
              cleanup();
            }
          });
          unsubscribers.push(unsub);
        }

        req.signal.addEventListener('abort', () => {
          cleanup();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
