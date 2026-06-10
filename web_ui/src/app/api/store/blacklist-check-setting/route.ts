import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';
import { jsonError, readJson } from '@/lib/api';

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const store = await getAccessibleStore(session.user.id, session.user.role, searchParams.get('storeId'));
  if (!store) return jsonError('No store found', 404);

  return NextResponse.json({ enabled: store.deliveryBlacklistCheckEnabled });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const body = await readJson<{ storeId?: unknown; enabled?: unknown }>(req);
  const storeId = typeof body?.storeId === 'string' ? body.storeId : null;
  const store = await getAccessibleStore(session.user.id, session.user.role, storeId);
  if (!store) return jsonError('No store found', 404);

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { deliveryBlacklistCheckEnabled: body?.enabled !== false },
    select: { deliveryBlacklistCheckEnabled: true },
  });

  return NextResponse.json({ enabled: updated.deliveryBlacklistCheckEnabled });
}
