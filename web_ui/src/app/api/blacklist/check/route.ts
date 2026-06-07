import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, normalizePhone } from "@/lib/api";

async function getBlacklistReader(req: Request) {
  const configuredToken = process.env.BLACKLIST_API_TOKEN;
  const requestToken = req.headers.get("x-api-key");

  if (configuredToken && requestToken === configuredToken) return { canRead: true, userId: null };

  const session = await auth();
  return {
    canRead: Boolean(session?.user?.id && session.user.role !== "CUSTOMER"),
    userId: session?.user?.id ?? null,
  };
}

export async function GET(req: Request) {
  const reader = await getBlacklistReader(req);
  if (!reader.canRead) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(req.url);
  const phone = normalizePhone(searchParams.get("phone"));

  if (!phone) {
    return jsonError("Phone parameter is required", 400);
  }

  try {
    const entries = await prisma.blacklist.findMany({
      where: { phoneNumber: phone },
      select: {
        id: true,
        reason: true,
        reporterId: true,
        reporter: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const latestDate = entries[0]?.createdAt ?? null;

    return NextResponse.json({
      isBlacklisted: entries.length > 0,
      phoneNumber: phone,
      count: entries.length,
      latestDate,
      reasons: entries.map((entry) => entry.reason),
      reports: entries.map((entry) => ({
        id: entry.id,
        reason: entry.reason,
        reporterId: entry.reporterId,
        reporterName: entry.reporter.name,
        createdAt: entry.createdAt,
        isMine: reader.userId ? entry.reporterId === reader.userId : false,
      })),
    });
  } catch (error) {
    console.error("[Blacklist Check Error]:", error);
    return jsonError("Internal server error", 500);
  }
}
