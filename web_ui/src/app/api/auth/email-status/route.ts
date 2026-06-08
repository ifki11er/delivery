import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, readJson } from "@/lib/api";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function providerLabel(provider?: string | null) {
  if (provider === "kakao") return "카카오";
  if (provider === "google" || provider === "google-native") return "구글";
  return "소셜";
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: unknown }>(req);
    const email = normalizeEmail(body?.email);

    if (!email) {
      return jsonError("이메일을 입력해주세요.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        password: true,
        deletedAt: true,
        status: true,
        accounts: {
          select: { provider: true },
          orderBy: { provider: "asc" },
        },
      },
    });

    if (!user || user.deletedAt || user.status === "WITHDRAWN") {
      return NextResponse.json(
        {
          exists: false,
          error: "가입정보가 없습니다. 회원가입을 진행해주세요.",
          redirectToRegister: true,
        },
        { status: 404 },
      );
    }

    if (!user.password) {
      const provider = providerLabel(user.accounts[0]?.provider);
      return NextResponse.json(
        {
          exists: true,
          hasPassword: false,
          error: `${provider}로 가입된 계정입니다. ${provider}로 로그인해주세요.`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ exists: true, hasPassword: true });
  } catch (error) {
    console.error("[Email Status POST Error]:", error);
    return jsonError("이메일 확인 중 오류가 발생했습니다.", 500);
  }
}
