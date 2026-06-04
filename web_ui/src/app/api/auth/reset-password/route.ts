import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // 보안을 위해 유저가 없어도 똑같은 성공 메시지를 반환하는 것이 일반적이나,
      // 현재는 편리한 테스트를 위해 에러를 던지겠습니다.
      return NextResponse.json({ error: '해당 이메일로 가입된 계정이 없습니다.' }, { status: 404 });
    }

    if (user.deletedAt) {
      return NextResponse.json({ error: '탈퇴한 계정입니다.' }, { status: 400 });
    }

    // UUID v4 Token 생성
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1시간 만료

    // 기존 토큰이 있다면 덮어쓰거나, 새로운 토큰 생성
    // Prisma 스키마 구조: VerificationToken { identifier, token, expires, @@unique([identifier, token]) }
    // 기존 토큰 삭제
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // 1번 방법(가짜 발송 모드) - 콘솔에 출력
    const resetUrl = `http://localhost:3000/login/reset?token=${token}`;
    console.log('\n=============================================');
    console.log('🔒 [비밀번호 재설정 링크 발송]');
    console.log(`수신자: ${email}`);
    console.log(`링크: ${resetUrl}`);
    console.log('=============================================\n');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reset Password POST Error]:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { token, newPassword } = await req.json();
    
    if (!token || !newPassword) {
      return NextResponse.json({ error: '토큰과 새 비밀번호가 필요합니다.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const vt = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!vt) {
      return NextResponse.json({ error: '유효하지 않거나 만료된 링크입니다.' }, { status: 400 });
    }

    if (vt.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: vt.identifier, token: vt.token } }
      });
      return NextResponse.json({ error: '만료된 링크입니다. 다시 요청해주세요.' }, { status: 400 });
    }

    // 해시 암호화 및 유저 정보 업데이트
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email: vt.identifier },
      data: { password: hashedPassword },
    });

    // 사용된 토큰 파기
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: vt.identifier, token: vt.token } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reset Password PUT Error]:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
