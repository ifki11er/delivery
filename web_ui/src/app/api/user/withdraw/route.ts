import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: true,
        employments: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admins cannot delete their account.' }, { status: 403 });
    }

    const activeStores = user.stores.filter(s => s.status !== 'CLOSED');
    if (activeStores.length > 0) {
      return NextResponse.json({ error: '운영 중이거나 정지된 가게를 소유하고 있습니다. 상점을 먼저 폐업 처리하거나 소유권을 이전해야 탈퇴할 수 있습니다.' }, { status: 400 });
    }

    const activeEmployments = user.employments.filter(e => e.status === 'ACTIVE');
    if (activeEmployments.length > 0) {
      return NextResponse.json({ error: '현재 재직 중인 매장이 있습니다. 먼저 퇴사 처리된 후 탈퇴할 수 있습니다.' }, { status: 400 });
    }

    // Anonymization (Soft Delete)
    const uniqueSuffix = Date.now().toString();
    
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          email: `DELETED_${uniqueSuffix}_${user.email || ''}`,
          phoneNumber: `DELETED_${uniqueSuffix}_${user.phoneNumber || ''}`,
          password: null,
          image: null,
          deletedAt: new Date(),
          status: 'WITHDRAWN',
        }
      }),
      prisma.account.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Withdraw Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
