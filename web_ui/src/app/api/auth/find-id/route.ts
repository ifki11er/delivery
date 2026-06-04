import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return NextResponse.json({ error: '전화번호를 입력해주세요.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { 
        phoneNumber,
        deletedAt: null // 탈퇴한 유저 제외
      },
      include: {
        accounts: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: '해당 전화번호로 가입된 계정이 없습니다.' }, { status: 404 });
    }

    // 1. 소셜 로그인 가입자인지 확인
    if (user.accounts && user.accounts.length > 0) {
      const provider = user.accounts[0].provider; // 'kakao', 'google' 등
      return NextResponse.json({ 
        success: true, 
        type: 'SOCIAL', 
        provider 
      });
    }

    // 2. 일반 이메일 가입자인 경우 마스킹 처리
    if (user.email) {
      const emailParts = user.email.split('@');
      const idPart = emailParts[0];
      const domainPart = emailParts[1] || '';

      let maskedId = '';
      if (idPart.length <= 3) {
        // 길이가 3글자 이하면 첫 1글자만 보여줌
        maskedId = idPart.substring(0, 1) + '*'.repeat(idPart.length - 1);
      } else {
        // 길이가 3글자 초과면 3글자만 보여줌
        maskedId = idPart.substring(0, 3) + '*'.repeat(idPart.length - 3);
      }

      const maskedEmail = `${maskedId}@${domainPart}`;

      return NextResponse.json({
        success: true,
        type: 'EMAIL',
        email: maskedEmail
      });
    }

    return NextResponse.json({ error: '이메일 정보가 없는 계정입니다.' }, { status: 400 });
  } catch (error) {
    console.error('[Find ID POST Error]:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
