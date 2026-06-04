import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '../../../../../../auth';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId, status } = await req.json();

    if (!storeId || !['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { status },
      select: {
        id: true,
        name: true,
        status: true,
        ownerId: true,
      }
    });

    if (status !== 'CLOSED') {
      // If store is revived (ACTIVE or SUSPENDED), ensure user is OWNER
      await prisma.user.update({
        where: { id: updatedStore.ownerId },
        data: { role: 'OWNER' }
      });
    } else {
      // If CLOSED, check if they have other active stores. If not, downgrade.
      const remainingStores = await prisma.store.count({
        where: { ownerId: updatedStore.ownerId, status: { not: 'CLOSED' } }
      });
      if (remainingStores === 0) {
        await prisma.user.update({
          where: { id: updatedStore.ownerId },
          data: { role: 'CUSTOMER' }
        });
      }
    }

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error('[Admin Store Status Update Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
