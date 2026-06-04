import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '../../../../../auth';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId, status } = await req.json();

    if (!storeId || !['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 사장님 본인의 상점인지 확인
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store || store.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Store not found or permission denied' }, { status: 403 });
    }

    // 상태 업데이트
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { status }
    });

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error('[Store Status Update Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
