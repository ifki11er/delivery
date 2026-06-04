import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonError, readJson } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const RESET_REQUEST_WINDOW_MS = 1000 * 60 * 15;
const RESET_REQUEST_LIMIT = 5;

function getAppUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: unknown }>(req);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) return jsonError("Email is required.", 400);

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit({
      key: `password-reset:${clientIp}:${email}`,
      limit: RESET_REQUEST_LIMIT,
      windowMs: RESET_REQUEST_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return jsonError("Too many password reset requests. Please try again later.", 429);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.deletedAt && user.status !== "WITHDRAWN") {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier: email } }),
        prisma.verificationToken.create({
          data: { identifier: email, token, expires },
        }),
      ]);

      const resetUrl = `${getAppUrl()}/login/reset?token=${token}`;
      console.info("[Password reset link]", { email, resetUrl });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Reset Password POST Error]:", error);
    return jsonError("Failed to request password reset.", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await readJson<{ token?: unknown; newPassword?: unknown }>(req);
    const token = typeof body?.token === "string" ? body.token : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!token || !newPassword) {
      return jsonError("Token and new password are required.", 400);
    }

    if (newPassword.length < 8) {
      return jsonError("Password must be at least 8 characters.", 400);
    }

    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!verificationToken) {
      return jsonError("Invalid or expired reset link.", 400);
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      });
      return jsonError("Reset link has expired.", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verificationToken.identifier },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Reset Password PUT Error]:", error);
    return jsonError("Failed to reset password.", 500);
  }
}
