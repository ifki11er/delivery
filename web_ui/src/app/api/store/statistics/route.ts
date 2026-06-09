import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const month = searchParams.get('month'); // YYYY-MM Format

    if (!storeId || !month) {
      return NextResponse.json({ error: 'Store ID and month (YYYY-MM) are required' }, { status: 400 });
    }

    // Auth check
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || (store.ownerId !== session.user.id && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
      where: { storeId },
      include: {
        account: { select: { name: true, email: true } },
        attendances: {
          where: { date: { startsWith: month } }
        }
      }
    });

    const stats = employees.map(emp => {
      let totalMinutes = 0;
      let lateCount = 0;
      let earlyLeaveCount = 0;
      let normalCount = 0;
      let absentCount = 0;
      const daysWorked = emp.attendances.length;

      emp.attendances.forEach(att => {
        totalMinutes += att.workMinutes;
        if (att.status === 'LATE') lateCount++;
        else if (att.status === 'EARLY_LEAVE') earlyLeaveCount++;
        else if (att.status === 'ABSENT') absentCount++;
        else normalCount++;
      });

      let calculatedSalary = 0;
      if (emp.wageType === 'HOURLY') {
        calculatedSalary = Math.floor((totalMinutes / 60) * emp.wageAmount);
      } else if (emp.wageType === 'DAILY') {
        calculatedSalary = daysWorked * emp.wageAmount;
      }

      return {
        employeeId: emp.id,
        name: emp.account?.name || emp.account?.email?.split('@')[0] || '직원',
        wageType: emp.wageType,
        wageAmount: emp.wageAmount,
        statistics: {
          totalMinutes,
          totalHours: (totalMinutes / 60).toFixed(1),
          daysWorked,
          lateCount,
          earlyLeaveCount,
          normalCount,
          absentCount
        },
        calculatedSalary
      };
    });

    return NextResponse.json({
      month,
      storeName: store.name,
      totalExpectedSalary: stats.reduce((acc, curr) => acc + curr.calculatedSalary, 0),
      employees: stats
    });

  } catch (error) {
    console.error('[Store Statistics Error]:', error);
    return NextResponse.json({ error: 'Failed to generate statistics' }, { status: 500 });
  }
}
