import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: true,
        employments: true,
      },
    });

    if (!user) return jsonError("User not found", 404);
    if (user.role === "ADMIN") return jsonError("Admins cannot delete their account.", 403);

    const activeStores = user.stores.filter((store) => store.status !== "CLOSED");
    if (activeStores.length > 0) {
      return jsonError("Close or transfer active stores before deleting your account.", 400);
    }

    const activeEmployments = user.employments.filter((employment) => employment.status === "ACTIVE");
    if (activeEmployments.length > 0) {
      return jsonError("Leave active stores before deleting your account.", 400);
    }

    const uniqueSuffix = Date.now().toString();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          email: user.email ? `DELETED_${uniqueSuffix}_${user.email}` : null,
          phoneNumber: user.phoneNumber ? `DELETED_${uniqueSuffix}_${user.phoneNumber}` : null,
          password: null,
          image: null,
          deletedAt: new Date(),
          status: "WITHDRAWN",
        },
      }),
      prisma.account.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Withdraw Error]:", error);
    return jsonError("Internal Server Error", 500);
  }
}
