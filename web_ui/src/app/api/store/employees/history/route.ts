import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get('phone') || '').replace(/\D/g, '');
  if (!phone) {
    return NextResponse.json({ items: [] });
  }

  try {
    const employees = await prisma.employee.findMany({
      where: { phoneNumber: phone },
      include: {
        attendances: { select: { status: true } },
        histories: { orderBy: { joinedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = employees.map((employee) => {
      const lateCount = employee.attendances.filter((row) => row.status === 'LATE').length;
      const absentCount = employee.attendances.filter((row) => row.status === 'ABSENT').length;
      const workDays = employee.attendances.filter((row) => row.status !== 'ABSENT').length;
      const latestHistory = employee.histories[0];
      return {
        joinedAt: latestHistory?.joinedAt ?? employee.createdAt,
        resignedAt: latestHistory?.resignedAt ?? null,
        workDays,
        lateCount,
        absentCount,
        resignationReason: latestHistory?.resignationReason ?? null,
        resignationNote: latestHistory?.resignationNote ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Employee History GET Error]:', error);
    return NextResponse.json({ error: 'Failed to fetch employee history' }, { status: 500 });
  }
}
