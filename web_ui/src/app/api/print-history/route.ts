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
  deletedAt: Date | null;
  status: string;
}) {
  return {
    id: job.id,
    raw_text: job.rawText,
    parsed_data: job.parsedData ?? '',
    timestamp: job.createdAt.toISOString(),
    status: job.status,
    deleted_at: job.deletedAt?.toISOString() ?? null,
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
  const showDeleted = searchParams.get('deleted') === '1';
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const dateFilter = fromDate && !Number.isNaN(fromDate.getTime()) || toDate && !Number.isNaN(toDate.getTime())
    ? {
        ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
        ...(toDate && !Number.isNaN(toDate.getTime()) ? { lt: toDate } : {}),
      }
    : null;

  const jobs = await prisma.printJob.findMany({
    where: {
      storeId: store.id,
      deletedAt: showDeleted ? { not: null } : null,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: showDeleted ? { deletedAt: 'desc' } : { createdAt: 'desc' },
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

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const store = await getAccessibleStore(session.user.id, session.user.role, searchParams.get('storeId'));
  if (!store) {
    return NextResponse.json({ error: 'No store found' }, { status: 404 });
  }

  const result = await prisma.printJob.updateMany({
    where: {
      id,
      storeId: store.id,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Print history not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
