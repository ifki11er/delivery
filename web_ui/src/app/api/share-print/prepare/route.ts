import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';
import { jsonError, normalizePhone, readJson } from '@/lib/api';

function getBusinessDate(timeZone?: string | null) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date()).replaceAll('-', '');
}

function serializeRule(rule: {
  id: string;
  scope: string;
  matchText: string;
  replacementText: string;
  createdAt: Date;
}) {
  return {
    id: rule.id,
    scope: rule.scope,
    matchText: rule.matchText,
    replacementText: rule.replacementText,
    createdAt: rule.createdAt.toISOString(),
  };
}

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
    select: {
      id: true,
      timeZone: true,
      menuLanguageMode: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return stores[0] ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const body = await readJson<{
    storeId?: unknown;
    phone?: unknown;
    skipBlacklist?: unknown;
  }>(req);
  const storeId = typeof body?.storeId === 'string' ? body.storeId : null;
  const phone = normalizePhone(body?.phone);
  const skipBlacklist = body?.skipBlacklist === true;

  const [store, user] = await Promise.all([
    getAccessibleStore(session.user.id, session.user.role, storeId),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deliveryBlacklistCheckEnabled: true },
    }),
  ]);

  if (!store) return jsonError('No store found', 404);
  if (!user) return jsonError('User not found', 404);

  if (user.deliveryBlacklistCheckEnabled && !skipBlacklist) {
    if (!phone) return jsonError('Phone parameter is required', 400);

    const entries = await prisma.blacklist.findMany({
      where: { phoneNumber: phone },
      select: {
        id: true,
        reason: true,
        reporterId: true,
        reporter: {
          select: { name: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (entries.length > 0) {
      return NextResponse.json({
        blocked: true,
        blacklist: {
          isBlacklisted: true,
          phoneNumber: phone,
          count: entries.length,
          latestDate: entries[0]?.createdAt ?? null,
          reports: entries.map((entry) => ({
            id: entry.id,
            reason: entry.reason,
            reporterId: entry.reporterId,
            reporterName: entry.reporter.name,
            createdAt: entry.createdAt,
            isMine: entry.reporterId === session.user.id,
          })),
        },
      });
    }
  }

  const businessDate = getBusinessDate(store.timeZone);
  const [counter, rules] = await Promise.all([
    prisma.storeDailySequence.upsert({
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
        sequence: { increment: 1 },
      },
    }),
    prisma.storeMenuLanguageRule.findMany({
      where: { storeId: store.id, scope: 'DELIVERY' },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return NextResponse.json({
    blocked: false,
    storeId: store.id,
    businessDate,
    orderSequence: counter.sequence,
    menuLanguageSettings: {
      enabled: store.menuLanguageMode !== 'KOREAN_ONLY',
      mode: store.menuLanguageMode,
      scope: 'DELIVERY',
      rules: rules.map(serializeRule),
    },
  });
}
