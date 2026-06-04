import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

// 내 프로필 조회
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true }
    });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// 온보딩 및 프로필 업데이트 (이름, 전화번호)
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, phoneNumber } = body;

    // 간단한 유효성 검사
    if (!name || !phoneNumber) {
      return NextResponse.json({ error: '이름과 전화번호는 필수입니다.' }, { status: 400 });
    }

    // 전화번호 중복 체크
    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    if (existingPhone && existingPhone.id !== session.user.id) {
      return NextResponse.json({ error: '이미 사용 중인 전화번호입니다.' }, { status: 400 });
    }

    // DB 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phoneNumber }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
