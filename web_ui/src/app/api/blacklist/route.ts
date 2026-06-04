import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, normalizePhone, readJson } from "@/lib/api";

type BlacklistReport = {
  id: string;
  reason: string;
  reporterId: string;
  reporterName: string | null;
  createdAt: Date;
};

type BlacklistGroup = {
  phoneNumber: string;
  count: number;
  latestDate: Date;
  reports: BlacklistReport[];
};

async function requireOwnerOrAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { session: null, response: jsonError("Unauthorized", 401) };
  if (session.user.role === "CUSTOMER") return { session: null, response: jsonError("Forbidden", 403) };
  return { session, response: null };
}

export async function GET(req: Request) {
  const authResult = await requireOwnerOrAdmin();
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(req.url);
  const query = normalizePhone(searchParams.get("q"));

  try {
    const where = query ? { phoneNumber: { contains: query } } : {};
    const latestPhones = await prisma.blacklist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { phoneNumber: true },
      distinct: ["phoneNumber"],
      take: 10,
    });

    const phoneList = latestPhones.map((entry) => entry.phoneNumber);
    if (phoneList.length === 0) return NextResponse.json([]);

    const rows = await prisma.blacklist.findMany({
      where: { phoneNumber: { in: phoneList } },
      include: {
        reporter: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const grouped = new Map<string, BlacklistGroup>();

    for (const row of rows) {
      const current = grouped.get(row.phoneNumber) ?? {
        phoneNumber: row.phoneNumber,
        count: 0,
        latestDate: row.createdAt,
        reports: [],
      };

      current.count += 1;
      if (row.createdAt > current.latestDate) current.latestDate = row.createdAt;
      current.reports.push({
        id: row.id,
        reason: row.reason,
        reporterId: row.reporter.id,
        reporterName: row.reporter.name,
        createdAt: row.createdAt,
      });
      grouped.set(row.phoneNumber, current);
    }

    return NextResponse.json(
      Array.from(grouped.values()).sort(
        (a, b) => b.latestDate.getTime() - a.latestDate.getTime(),
      ),
    );
  } catch (error) {
    console.error("[Blacklist GET Error]:", error);
    return jsonError("Failed to fetch blacklist", 500);
  }
}

export async function POST(req: Request) {
  const authResult = await requireOwnerOrAdmin();
  if (authResult.response) return authResult.response;

  try {
    const body = await readJson<{ phoneNumber?: unknown; reason?: unknown }>(req);
    const phoneNumber = normalizePhone(body?.phoneNumber);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!phoneNumber || !reason) {
      return jsonError("Phone number and reason are required", 400);
    }

    const entry = await prisma.blacklist.upsert({
      where: {
        phoneNumber_reporterId: {
          phoneNumber,
          reporterId: authResult.session.user.id,
        },
      },
      update: { reason },
      create: {
        phoneNumber,
        reason,
        reporterId: authResult.session.user.id,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[Blacklist POST Error]:", error);
    return jsonError("Failed to add to blacklist", 500);
  }
}

export async function PUT(req: Request) {
  const authResult = await requireOwnerOrAdmin();
  if (authResult.response) return authResult.response;

  try {
    const body = await readJson<{ id?: unknown; reason?: unknown }>(req);
    const id = typeof body?.id === "string" ? body.id : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!id || !reason) {
      return jsonError("ID and reason are required", 400);
    }

    const entry = await prisma.blacklist.findUnique({ where: { id } });
    if (!entry || entry.reporterId !== authResult.session.user.id) {
      return jsonError("Forbidden", 403);
    }

    const updated = await prisma.blacklist.update({
      where: { id },
      data: { reason },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Blacklist PUT Error]:", error);
    return jsonError("Failed to update blacklist", 500);
  }
}
