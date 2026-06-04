import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson } from "@/lib/api";

async function requireAdmin() {
  const session = await auth();
  return Boolean(session?.user && session.user.role === "ADMIN");
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized", 403);

  try {
    const body = await readJson<{ id?: unknown; reason?: unknown }>(req);
    const id = typeof body?.id === "string" ? body.id : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!id || !reason) return jsonError("Missing fields", 400);

    const updated = await prisma.blacklist.update({
      where: { id },
      data: { reason },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Admin Blacklist PUT Error]:", error);
    return jsonError("Failed to update reason", 500);
  }
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return jsonError("Unauthorized", 403);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonError("Missing ID", 400);

    await prisma.blacklist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Blacklist DELETE Error]:", error);
    return jsonError("Failed to delete entry", 500);
  }
}
