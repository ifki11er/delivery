import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';
import { jsonError, readJson } from '@/lib/api';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deliveryBlacklistCheckEnabled: true },
  });
  if (!user) return jsonError('User not found', 404);

  return NextResponse.json({ enabled: user.deliveryBlacklistCheckEnabled });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const body = await readJson<{ enabled?: unknown }>(req);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { deliveryBlacklistCheckEnabled: body?.enabled !== false },
    select: { deliveryBlacklistCheckEnabled: true },
  });

  return NextResponse.json({ enabled: updated.deliveryBlacklistCheckEnabled });
}
