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

function serializeRule(rule: {
  id: string;
  matchText: string;
  replacementText: string;
  createdAt: Date;
}) {
  return {
    id: rule.id,
    matchText: rule.matchText,
    replacementText: rule.replacementText,
    createdAt: rule.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const store = await getAccessibleStore(session.user.id, session.user.role, searchParams.get('storeId'));
  if (!store) return NextResponse.json({ enabled: false, rules: [] });

  const rules = await prisma.storeMenuLanguageRule.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    enabled: store.menuLanguageEnabled,
    rules: rules.map(serializeRule),
  });
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
    data: { menuLanguageEnabled: Boolean(body?.enabled) },
    select: { menuLanguageEnabled: true },
  });

  return NextResponse.json({ enabled: updated.menuLanguageEnabled });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const body = await readJson<{
    storeId?: unknown;
    matchText?: unknown;
    replacementText?: unknown;
  }>(req);
  const storeId = typeof body?.storeId === 'string' ? body.storeId : null;
  const store = await getAccessibleStore(session.user.id, session.user.role, storeId);
  if (!store) return jsonError('No store found', 404);

  const matchText = typeof body?.matchText === 'string' ? body.matchText.trim() : '';
  const replacementText = typeof body?.replacementText === 'string' ? body.replacementText.trim() : '';

  if (!matchText || !replacementText) {
    return jsonError('Match text and replacement text are required', 400);
  }

  const rule = await prisma.storeMenuLanguageRule.upsert({
    where: {
      storeId_matchText: {
        storeId: store.id,
        matchText,
      },
    },
    update: { replacementText },
    create: {
      storeId: store.id,
      matchText,
      replacementText,
    },
  });

  return NextResponse.json({ rule: serializeRule(rule) });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const body = await readJson<{
    storeId?: unknown;
    id?: unknown;
    matchText?: unknown;
    replacementText?: unknown;
  }>(req);
  const storeId = typeof body?.storeId === 'string' ? body.storeId : null;
  const store = await getAccessibleStore(session.user.id, session.user.role, storeId);
  if (!store) return jsonError('No store found', 404);

  const id = typeof body?.id === 'string' ? body.id : '';
  const matchText = typeof body?.matchText === 'string' ? body.matchText.trim() : '';
  const replacementText = typeof body?.replacementText === 'string' ? body.replacementText.trim() : '';

  if (!id || !matchText || !replacementText) {
    return jsonError('Rule ID, match text and replacement text are required', 400);
  }

  const duplicate = await prisma.storeMenuLanguageRule.findFirst({
    where: {
      storeId: store.id,
      matchText,
      NOT: { id },
    },
  });
  if (duplicate) {
    return jsonError('A rule with this match text already exists', 400);
  }

  const result = await prisma.storeMenuLanguageRule.updateMany({
    where: {
      id,
      storeId: store.id,
    },
    data: {
      matchText,
      replacementText,
    },
  });
  if (result.count === 0) return jsonError('Rule not found', 404);

  const rule = await prisma.storeMenuLanguageRule.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ rule: serializeRule(rule) });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const storeId = searchParams.get('storeId');
  const store = await getAccessibleStore(session.user.id, session.user.role, storeId);
  if (!store) return jsonError('No store found', 404);
  if (!id) return jsonError('Rule ID is required', 400);

  await prisma.storeMenuLanguageRule.deleteMany({
    where: {
      id,
      storeId: store.id,
    },
  });

  return NextResponse.json({ success: true });
}
