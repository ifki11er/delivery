import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonError, readJson } from "@/lib/api";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  try {
    const body = await readJson<{ storeId?: unknown }>(req);
    const storeId = typeof body?.storeId === "string" ? body.storeId : undefined;

    const store = storeId
      ? await prisma.store.findUnique({ where: { id: storeId } })
      : await prisma.store.findFirst({
          where: { ownerId: session.user.id, status: { not: "CLOSED" } },
          orderBy: { createdAt: "asc" },
        });

    if (!store || store.ownerId !== session.user.id) {
      return jsonError("Store not found", 404);
    }

    const wifiIpAddress = getClientIp(req);
    if (wifiIpAddress === "unknown") {
      return jsonError("Could not determine request IP address", 400);
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { wifiIpAddress },
      select: { id: true, wifiIpAddress: true },
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error("[Store WiFi IP Error]:", error);
    return jsonError("Failed to update Wi-Fi IP", 500);
  }
}
