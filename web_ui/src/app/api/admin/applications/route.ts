import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // 관리자(ADMIN) 권한 검증
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, action } = await req.json();

    if (!id || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const application = await prisma.businessApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: '신청내역을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // 1. 상태 승인으로 변경 및 2. 유저 권한을 OWNER로 업그레이드 (트랜잭션)
      await prisma.$transaction([
        prisma.businessApplication.update({
          where: { id },
          data: { status: 'APPROVED' },
        }),
        prisma.user.update({
          where: { id: application.userId },
          data: { role: 'OWNER' },
        }),
      ]);
    } else if (action === 'REJECT') {
      // 상태 반려로 변경
      await prisma.businessApplication.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
