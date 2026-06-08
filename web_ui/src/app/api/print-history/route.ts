import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '@/lib/prisma';

async function getAccessibleStore(userId: string, role: string | undefined, storeId?: string | null) {
  const stores = await prisma.store.findMany({
    where: {
      status: { not: 'CLOSED' },
      ...(storeId ? { id: storeId } : {}),
      OR: [
        { ownerId: userId },
        ...(role === 'ADMIN' ? [{}] : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return stores[0] ?? null;
}

function serializePrintJob(job: {
  id: string;
  rawText: string;
  parsedData: string | null;
  createdAt: Date;
  status: string;
}) {
  return {
    id: job.id,
    raw_text: job.rawText,
    parsed_data: job.parsedData ?? '',
    timestamp: job.createdAt.toISOString(),
    status: job.status,
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const store = await getAccessibleStore(session.user.id, session.user.role, searchParams.get('storeId'));
  if (!store) {
    return NextResponse.json({ items: [] });
  }

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const jobs = await prisma.printJob.findMany({
    where: {
      storeId: store.id,
      ...(fromDate && !Number.isNaN(fromDate.getTime()) || toDate && !Number.isNaN(toDate.getTime())
        ? {
            createdAt: {
              ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
              ...(toDate && !Number.isNaN(toDate.getTime()) ? { lt: toDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ items: jobs.map(serializePrintJob) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const store = await getAccessibleStore(session.user.id, session.user.role, body.storeId);
  if (!store) {
    return NextResponse.json({ error: 'No store found' }, { status: 404 });
  }

  const rawText = String(body.rawText || '').trim();
  if (!rawText) {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
  }

  const job = await prisma.printJob.create({
    data: {
      storeId: store.id,
      userId: session.user.id,
      source: String(body.source || 'DELIVERY_SHARE'),
      status: String(body.status || 'PRINTED'),
      rawText,
      parsedData: body.parsedData == null ? null : String(body.parsedData),
      phone: body.phone == null ? null : String(body.phone),
    },
  });

  return NextResponse.json({ item: serializePrintJob(job) });
}
