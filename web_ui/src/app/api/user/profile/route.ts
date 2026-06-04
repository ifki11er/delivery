import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, normalizePhone, readJson } from "@/lib/api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("[Profile GET Error]:", error);
    return jsonError("Failed to fetch profile", 500);
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  try {
    const body = await readJson<{ name?: unknown; phoneNumber?: unknown }>(req);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phoneNumber = normalizePhone(body?.phoneNumber);

    if (!name || !phoneNumber) {
      return jsonError("Name and phone number are required.", 400);
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });

    if (existingPhone && existingPhone.id !== session.user.id) {
      return jsonError("Phone number is already in use.", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phoneNumber },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("[Profile PUT Error]:", error);
    return jsonError("Failed to update profile", 500);
  }
}
