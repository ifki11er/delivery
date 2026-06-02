import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow OWNER or ADMIN to view the blacklist
  if (session.user.role === 'CUSTOMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q'); // Partial phone number

  try {
    const whereClause = query ? { phoneNumber: { contains: query } } : {};
    
    const blacklist = await prisma.blacklist.findMany({
      where: whereClause,
      include: {
        reporter: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit results
    });

    return NextResponse.json(blacklist);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch blacklist' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role === 'CUSTOMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { phoneNumber, reason } = body;

    if (!phoneNumber || !reason) {
      return NextResponse.json({ error: 'Phone number and reason are required' }, { status: 400 });
    }

    // Clean phone number (remove hyphens if any, though storing with hyphens is also fine)
    const cleanedPhone = phoneNumber.replace(/[^0-9]/g, '');

    // Upsert to handle duplicates gracefully
    const entry = await prisma.blacklist.upsert({
      where: { phoneNumber: cleanedPhone },
      update: {
        reason: reason, // Overwrite reason or append
        reporterId: session.user.id
      },
      create: {
        phoneNumber: cleanedPhone,
        reason: reason,
        reporterId: session.user.id
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add to blacklist' }, { status: 500 });
  }
}
