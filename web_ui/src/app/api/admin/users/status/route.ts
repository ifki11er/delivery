import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '../../../../../../auth';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, status } = await req.json();

    if (!userId || !['ACTIVE', 'SUSPENDED', 'WITHDRAWN'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 자기 자신은 변경할 수 없음
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot change your own status' }, { status: 403 });
    }

    let dataToUpdate: any = { status };

    // 탈퇴 처리일 경우 추가 조치 (개인정보 보호 등)
    if (status === 'WITHDRAWN') {
      dataToUpdate.deletedAt = new Date();
      // 이메일이나 전화번호 마스킹 처리 등을 추가할 수 있습니다.
    } else {
      // 다시 활성화하거나 정지할 경우 deletedAt 초기화
      dataToUpdate.deletedAt = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[Admin User Status Update Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
