import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '../../../../../auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 사용자 통계
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { deletedAt: null } });
    const withdrawnUsers = await prisma.user.count({ where: { deletedAt: { not: null } } });

    // 상점(사업자) 통계
    const activeStores = await prisma.store.count({ where: { status: 'ACTIVE' } });
    const suspendedStores = await prisma.store.count({ where: { status: 'SUSPENDED' } });
    const closedStores = await prisma.store.count({ where: { status: 'CLOSED' } });
    const pendingApplications = await prisma.businessApplication.count({ where: { status: 'PENDING' } });

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        withdrawn: withdrawnUsers,
      },
      stores: {
        active: activeStores,
        suspended: suspendedStores,
        closed: closedStores,
        pending: pendingApplications,
      }
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
