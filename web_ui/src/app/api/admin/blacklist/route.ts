import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, reason } = await req.json();
    if (!id || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const updated = await prisma.blacklist.update({
      where: { id },
      data: { reason }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Admin Blacklist PUT Error]:', error);
    return NextResponse.json({ error: 'Failed to update reason' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    await prisma.blacklist.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Blacklist DELETE Error]:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
