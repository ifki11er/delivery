import { NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../../../auth";
import { jsonError, readJson } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

function isUserStatus(value: unknown): value is UserStatus {
  return value === "ACTIVE" || value === "SUSPENDED" || value === "WITHDRAWN";
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return jsonError("Unauthorized", 401);
  }

  try {
    const body = await readJson<{ userId?: unknown; status?: unknown }>(req);
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const status = body?.status;

    if (!userId || !isUserStatus(status)) {
      return jsonError("Invalid parameters", 400);
    }

    if (userId === session.user.id) {
      return jsonError("Cannot change your own status", 403);
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    const updatedUser = existingUser
      ? await prisma.user.update({
          where: { id: userId },
          data: {
            status,
            deletedAt: status === "WITHDRAWN" ? new Date() : null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        })
      : await prisma.employeeAccount.update({
          where: { id: userId },
          data: {
            status,
            deletedAt: status === "WITHDRAWN" ? new Date() : null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        });

    await writeAuditLog({
      actorId: session.user.id,
      action: "admin_user_status_updated",
      targetType: "user",
      targetId: updatedUser.id,
      metadata: { status },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("[Admin User Status Update Error]:", error);
    return jsonError("Internal Server Error", 500);
  }
}
