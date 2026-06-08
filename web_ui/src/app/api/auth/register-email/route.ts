import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function providerLabel(provider?: string | null) {
  if (provider === "kakao") return "카카오";
  if (provider === "google" || provider === "google-native") return "구글";
  return "기존 계정";
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(req);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return jsonError("이메일과 비밀번호를 입력해주세요.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        deletedAt: true,
        status: true,
        accounts: {
          select: { provider: true },
          orderBy: { provider: "asc" },
        },
      },
    });

    if (existingUser && !existingUser.deletedAt && existingUser.status !== "WITHDRAWN") {
      const provider = existingUser.password
        ? "이메일"
        : providerLabel(existingUser.accounts[0]?.provider);
      return NextResponse.json(
        {
          error: `이미 ${provider}로 가입되어 있습니다.\n로그인 페이지에서 로그인해주세요.`,
          redirectToLogin: true,
        },
        { status: 409 },
      );
    }

    if (existingUser) {
      return jsonError("사용할 수 없는 이메일입니다. 다른 이메일을 입력해주세요.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: { id: true, email: true },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "user_registered_with_email",
      targetType: "user",
      targetId: user.id,
      metadata: { email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Register Email POST Error]:", error);
    return jsonError("회원가입 처리 중 오류가 발생했습니다.", 500);
  }
}
