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
    
    const latestPhones = await prisma.blacklist.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: { phoneNumber: true },
      distinct: ['phoneNumber'],
      take: 10
    });

    const phoneList = latestPhones.map(p => p.phoneNumber);

    const blacklist = await prisma.blacklist.findMany({
      where: {
        ...whereClause,
        phoneNumber: { in: phoneList }
      },
      include: {
        reporter: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Grouping by phoneNumber
    const grouped = blacklist.reduce((acc: any, curr: any) => {
      if (!acc[curr.phoneNumber]) {
        acc[curr.phoneNumber] = {
          phoneNumber: curr.phoneNumber,
          count: 0,
          latestDate: curr.createdAt,
          reports: []
        };
      }
      acc[curr.phoneNumber].count += 1;
      acc[curr.phoneNumber].reports.push({
        id: curr.id,
        reason: curr.reason,
        reporterId: curr.reporter.id,
        reporterName: curr.reporter.name,
        createdAt: curr.createdAt
      });
      if (new Date(curr.createdAt) > new Date(acc[curr.phoneNumber].latestDate)) {
        acc[curr.phoneNumber].latestDate = curr.createdAt;
      }
      return acc;
    }, {});

    const groupedArray = Object.values(grouped).sort((a: any, b: any) => 
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );

    return NextResponse.json(groupedArray);
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
      where: { 
        phoneNumber_reporterId: {
          phoneNumber: cleanedPhone,
          reporterId: session.user.id
        }
      },
      update: {
        reason: reason // Overwrite reason if same reporter
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

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === 'CUSTOMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, reason } = body;

    if (!id || !reason) {
      return NextResponse.json({ error: 'ID and reason are required' }, { status: 400 });
    }

    const entry = await prisma.blacklist.findUnique({ where: { id } });
    if (!entry || entry.reporterId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.blacklist.update({
      where: { id },
      data: { reason }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update blacklist' }, { status: 500 });
  }
}
