import { prisma } from "@/lib/prisma";
import crypto from "crypto";

let auditTableReady = false;

async function ensureAuditTable() {
  if (auditTableReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx
    ON audit_logs (action, created_at DESC)
  `);

  auditTableReady = true;
}

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await ensureAuditTable();
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, metadata, ip_address)
      VALUES (
        ${id},
        ${input.actorId ?? null},
        ${input.action},
        ${input.targetType ?? null},
        ${input.targetId ?? null},
        ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,
        ${input.ipAddress ?? null}
      )
    `;
  } catch (error) {
    console.error("[Audit Log Error]:", error);
  }
}
