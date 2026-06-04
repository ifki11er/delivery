import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { wifiIpAddress } = await req.json();

    if (!wifiIpAddress) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    // 사장님의 첫 번째 상점(기본 상점)을 찾아 IP를 업데이트
    const store = await prisma.store.findFirst({
      where: { ownerId: session.user.id }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found for this owner' }, { status: 404 });
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { wifiIpAddress }
    });

    return NextResponse.json({ success: true, wifiIpAddress: updated.wifiIpAddress });
  } catch (error) {
    console.error('Update wifi IP error:', error);
    return NextResponse.json({ error: 'Failed to update WiFi IP' }, { status: 500 });
  }
}
