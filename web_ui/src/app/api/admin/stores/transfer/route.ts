import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId, ownerEmail } = await req.json();
    const normalizedEmail = typeof ownerEmail === 'string' ? ownerEmail.trim().toLowerCase() : '';

    if (!storeId || !normalizedEmail) {
      return NextResponse.json({ error: '상점과 새 사장님 이메일을 입력해주세요.' }, { status: 400 });
    }

    const [store, nextOwner] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId }, select: { id: true, name: true, ownerId: true } }),
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, email: true, name: true, status: true } }),
    ]);

    if (!store) {
      return NextResponse.json({ error: '상점을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!nextOwner || nextOwner.status !== 'ACTIVE') {
      return NextResponse.json({ error: '활성 사용자 계정을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (store.ownerId === nextOwner.id) {
      return NextResponse.json({ error: '이미 해당 사용자가 사장님입니다.' }, { status: 400 });
    }

    const previousOwnerId = store.ownerId;
    const updatedStore = await prisma.$transaction(async (tx) => {
      const updated = await tx.store.update({
        where: { id: store.id },
        data: { ownerId: nextOwner.id },
        select: {
          id: true,
          name: true,
          status: true,
          owner: { select: { name: true, email: true } },
        },
      });

      await tx.user.update({
        where: { id: nextOwner.id },
        data: { role: 'OWNER' },
      });

      const previousOwnerActiveStores = await tx.store.count({
        where: { ownerId: previousOwnerId, status: { not: 'CLOSED' } },
      });

      if (previousOwnerActiveStores === 0) {
        await tx.user.update({
          where: { id: previousOwnerId },
          data: { role: 'CUSTOMER' },
        });
      }

      return updated;
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: 'admin_store_transferred',
      targetType: 'store',
      targetId: store.id,
      metadata: {
        previousOwnerId,
        nextOwnerId: nextOwner.id,
        nextOwnerEmail: nextOwner.email,
      },
    });

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error('[Admin Store Transfer Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
