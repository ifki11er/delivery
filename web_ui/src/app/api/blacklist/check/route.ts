import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, normalizePhone } from "@/lib/api";

async function canReadBlacklist(req: Request) {
  const configuredToken = process.env.BLACKLIST_API_TOKEN;
  const requestToken = req.headers.get("x-api-key");

  if (configuredToken && requestToken === configuredToken) return true;

  const session = await auth();
  return Boolean(session?.user?.id && session.user.role !== "CUSTOMER");
}

export async function GET(req: Request) {
  if (!(await canReadBlacklist(req))) {
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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      isBlacklisted: entries.length > 0,
      count: entries.length,
      reasons: entries.map((entry) => entry.reason),
    });
  } catch (error) {
    console.error("[Blacklist Check Error]:", error);
    return jsonError("Internal server error", 500);
  }
}
