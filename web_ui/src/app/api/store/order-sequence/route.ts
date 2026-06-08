import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

async function getAccessibleStore(userId: string, role: string | undefined, storeId?: string | null) {
  const stores = await prisma.store.findMany({
    where: {
      status: { not: 'CLOSED' },
      ...(storeId ? { id: storeId } : {}),
      OR: [
        { ownerId: userId },
        {
          employees: {
            some: {
              userId,
              role: 'MANAGER',
              status: 'ACTIVE',
            },
          },
        },
        ...(role === 'ADMIN' ? [{}] : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return stores[0] ?? null;
}

function getBusinessDate(timeZone?: string | null) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date()).replaceAll('-', '');
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const store = await getAccessibleStore(session.user.id, session.user.role, body.storeId);
  if (!store) {
    return NextResponse.json({ error: 'No store found' }, { status: 404 });
  }

  const businessDate = getBusinessDate(store.timeZone);
  const counter = await prisma.storeDailySequence.upsert({
    where: {
      storeId_businessDate: {
        storeId: store.id,
        businessDate,
      },
    },
    create: {
      storeId: store.id,
      businessDate,
      sequence: 1,
    },
    update: {
      sequence: {
        increment: 1,
      },
    },
  });

  return NextResponse.json({
    storeId: store.id,
    businessDate,
    sequence: counter.sequence,
  });
}
