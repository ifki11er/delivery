import { prisma } from "@/lib/prisma";

let rateLimitTableReady = false;

async function ensureRateLimitTable() {
  if (rateLimitTableReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx
    ON rate_limit_buckets (reset_at)
  `);

  rateLimitTableReady = true;
}

type RateLimitRow = {
  count: number;
  reset_at: Date;
};

export async function checkDbRateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  await ensureRateLimitTable();

  const resetAt = new Date(Date.now() + windowMs);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<RateLimitRow[]>`
      SELECT count, reset_at
      FROM rate_limit_buckets
      WHERE key = ${key}
      FOR UPDATE
    `;

    const current = rows[0];
    if (!current || current.reset_at <= new Date()) {
      await tx.$executeRaw`
        INSERT INTO rate_limit_buckets (key, count, reset_at, updated_at)
        VALUES (${key}, 1, ${resetAt}, NOW())
        ON CONFLICT (key)
        DO UPDATE SET count = 1, reset_at = ${resetAt}, updated_at = NOW()
      `;
      return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt };
    }

    if (current.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: current.reset_at };
    }

    const nextCount = current.count + 1;
    await tx.$executeRaw`
      UPDATE rate_limit_buckets
      SET count = ${nextCount}, updated_at = NOW()
      WHERE key = ${key}
    `;

    return { allowed: true, remaining: Math.max(limit - nextCount, 0), resetAt: current.reset_at };
  });
}
