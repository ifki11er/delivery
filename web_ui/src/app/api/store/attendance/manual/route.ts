import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timeStringToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  try {
    const body = await req.json();
    const { employeeId, date, checkInTimeStr, checkOutTimeStr, status } = body; 

    if (!employeeId || !date || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the caller is the owner of the store the employee belongs to
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { store: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employee.store.ownerId !== session.user.id) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      const isManager = await prisma.employee.findFirst({
        where: { storeId: employee.storeId, userId: session.user.id, role: 'MANAGER', status: 'ACTIVE' }
      });
      if (user?.role !== 'ADMIN' && !isManager) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Prepare Date objects
    let checkInTime = null;
    let checkOutTime = null;
    let workMinutes = 0;

    if (status !== 'ABSENT') {
      if (checkInTimeStr) {
        checkInTime = new Date(`${date}T${checkInTimeStr}:00`);
      }
      if (checkOutTimeStr) {
        checkOutTime = new Date(`${date}T${checkOutTimeStr}:00`);
      }
      
      if (checkInTime && checkOutTime) {
        workMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
        if (workMinutes < 0) workMinutes = 0; // Prevent negative if dates cross midnight without handling
      }
    }

    // Calculate calculatedWage based on the logic
    const startExpected = timeStringToMinutes(employee.workStartTime);
    const endExpected = timeStringToMinutes(employee.workEndTime);
    const expectedMins = endExpected - startExpected;
    let calculatedWage = null;

    if (employee.wageType === 'HOURLY') {
      calculatedWage = Math.floor((workMinutes / 60) * employee.wageAmount);
    } else if (employee.wageType === 'DAILY') {
      if (expectedMins > 0) {
        if (workMinutes >= expectedMins) {
          calculatedWage = employee.wageAmount;
        } else {
          calculatedWage = Math.floor((workMinutes / expectedMins) * employee.wageAmount);
        }
      } else {
        calculatedWage = employee.wageAmount;
      }
    } // MONTHLY stays null

    // Upsert Attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employeeId,
          date: date
        }
      },
      update: {
        status: status,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        workMinutes: workMinutes,
        wageType: employee.wageType,
        wageAmount: employee.wageAmount,
        calculatedWage: calculatedWage
      },
      create: {
        employeeId: employeeId,
        date: date,
        status: status,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        workMinutes: workMinutes,
        wageType: employee.wageType,
        wageAmount: employee.wageAmount,
        calculatedWage: calculatedWage
      }
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error('[API Manual Attendance POST Error]:', error);
    return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
  }
}
