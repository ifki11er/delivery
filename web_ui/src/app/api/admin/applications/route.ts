import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson } from "@/lib/api";

type ApplicationAction = "APPROVE" | "REJECT";

function isApplicationAction(value: unknown): value is ApplicationAction {
  return value === "APPROVE" || value === "REJECT";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  try {
    const body = await readJson<{ id?: unknown; action?: unknown }>(req);
    const id = typeof body?.id === "string" ? body.id : "";
    const action = body?.action;

    if (!id || !isApplicationAction(action)) {
      return jsonError("Invalid request", 400);
    }

    const application = await prisma.businessApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return jsonError("Application not found", 404);
    }

    if (action === "APPROVE") {
      await prisma.$transaction([
        prisma.businessApplication.update({
          where: { id },
          data: { status: "APPROVED" },
        }),
        prisma.user.update({
          where: { id: application.userId },
          data: { role: "OWNER" },
        }),
        prisma.store.create({
          data: {
            ownerId: application.userId,
            name: application.businessName,
            address: application.address,
            contact: application.contact,
            representativeName: application.representativeName,
            businessRegNo: application.businessRegNo,
          },
        }),
      ]);
    } else {
      await prisma.businessApplication.update({
        where: { id },
        data: { status: "REJECTED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Application Error]:", error);
    return jsonError("Internal Server Error", 500);
  }
}
