import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { jsonError, normalizePhone, readJson } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

function providerLabel(provider?: string | null) {
  if (provider === "kakao") return "카카오";
  if (provider === "google" || provider === "google-native") return "구글";
  if (provider === "credentials" || provider === "email") return "이메일";
  return provider || "기존 계정";
}

function resolveLoginProvider(user: {
  password: string | null;
  accounts: { provider: string }[];
}) {
  const accountProvider = user.accounts[0]?.provider;
  if (accountProvider) return providerLabel(accountProvider);
  if (user.password) return "이메일";
  return "기존 계정";
}

function isDisposableDuplicateAccount(user: {
  phoneNumber: string | null;
  role: string;
  status: string;
  _count: {
    applications: number;
    stores: number;
    blacklists: number;
    printJobs: number;
  };
}) {
  return (
    !user.phoneNumber &&
    user.role === "CUSTOMER" &&
    user.status === "ACTIVE" &&
    user._count.applications === 0 &&
    user._count.stores === 0 &&
    user._count.blacklists === 0 &&
    user._count.printJobs === 0
  );
}

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
    const body = await readJson<{ name?: unknown; phoneNumber?: unknown; autoCreateStore?: unknown }>(req);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phoneNumber = normalizePhone(body?.phoneNumber);
    const autoCreateStore = body?.autoCreateStore === true;

    if (!name || !phoneNumber) {
      return jsonError("Name and phone number are required.", 400);
    }

    const [existingPhone, currentUser] = await Promise.all([
      prisma.user.findUnique({
        where: { phoneNumber },
        select: {
          id: true,
          password: true,
          accounts: {
            select: { provider: true },
            orderBy: { provider: "asc" },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          status: true,
          _count: {
            select: {
              applications: true,
              stores: true,
              blacklists: true,
              printJobs: true,
            },
          },
        },
      }),
    ]);

    if (!currentUser) {
      return jsonError("Unauthorized", 401);
    }

    if (existingPhone && existingPhone.id !== session.user.id) {
      const loginProvider = resolveLoginProvider(existingPhone);
      const message = `이미 ${loginProvider}로 가입되어 있습니다.\n${loginProvider}로 로그인해주세요.`;
      const cleanedDuplicateAccount = isDisposableDuplicateAccount(currentUser);

      if (cleanedDuplicateAccount) {
        await prisma.$transaction([
          prisma.account.deleteMany({ where: { userId: currentUser.id } }),
          prisma.session.deleteMany({ where: { userId: currentUser.id } }),
          prisma.user.delete({ where: { id: currentUser.id } }),
        ]);

        await writeAuditLog({
          actorId: null,
          action: "duplicate_signup_account_cleaned",
          targetType: "user",
          targetId: currentUser.id,
          metadata: {
            duplicatePhoneNumber: phoneNumber,
            existingUserId: existingPhone.id,
            loginProvider,
          },
        });
      }

      return NextResponse.json(
        {
          error: message,
          duplicateAccountCleaned: cleanedDuplicateAccount,
          loginProvider,
        },
        { status: 409 },
      );
    }

    const existingActiveStoreCount = await prisma.store.count({
      where: {
        ownerId: session.user.id,
        status: { not: "CLOSED" },
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name,
          phoneNumber,
          role: autoCreateStore ? "OWNER" : undefined,
        },
        select: { id: true, name: true, email: true, phoneNumber: true, role: true },
      });

      let store = null;
      if (autoCreateStore && existingActiveStoreCount === 0) {
        store = await tx.store.create({
          data: {
            ownerId: session.user.id,
            name: `${name}의 상점`,
            contact: phoneNumber,
            representativeName: name,
            currency: "VND",
            timeZone: "Asia/Ho_Chi_Minh",
          },
          select: { id: true, name: true },
        });
      }

      return { user: updatedUser, store };
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: "user_profile_updated",
      targetType: "user",
      targetId: session.user.id,
      metadata: { changedFields: ["name", "phoneNumber"] },
    });

    return NextResponse.json({ success: true, user: result.user, store: result.store });
  } catch (error) {
    console.error("[Profile PUT Error]:", error);
    return jsonError("Failed to update profile", 500);
  }
}
