import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { prisma } from '@/lib/prisma';
import { normalizeTimeZone, zonedDateTimeToUtc } from '@/lib/time-zone';

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
    const { employeeId, date, checkInTimeStr, checkOutTimeStr, status, timeZone } = body; 

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
      if (user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Prepare Date objects
    let checkInTime = null;
    let checkOutTime = null;
    let workMinutes = 0;
    const effectiveTimeZone =
      employee.store.timeZone === 'UTC' ? normalizeTimeZone(timeZone) : employee.store.timeZone;

    if (status !== 'ABSENT') {
      if (checkInTimeStr) {
        checkInTime = zonedDateTimeToUtc(date, checkInTimeStr, effectiveTimeZone);
      }
      if (checkOutTimeStr) {
        checkOutTime = zonedDateTimeToUtc(date, checkOutTimeStr, effectiveTimeZone);
      }
      
      if (checkInTime && checkOutTime) {
        workMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
        if (workMinutes < 0) workMinutes = 0; // Prevent negative if dates cross midnight without handling
      }
    }

    // Calculate calculatedWage only for full-management employees.
    const startExpected = timeStringToMinutes(employee.workStartTime);
    const endExpected = timeStringToMinutes(employee.workEndTime);
    const expectedMins = endExpected - startExpected;
    let calculatedWage = null;
    const shouldCalculateWage = employee.managementMode === 'FULL';

    if (shouldCalculateWage && employee.wageType === 'HOURLY') {
      calculatedWage = Math.floor((workMinutes / 60) * employee.wageAmount);
    } else if (shouldCalculateWage && employee.wageType === 'DAILY') {
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
        wageType: shouldCalculateWage ? employee.wageType : 'NONE',
        wageAmount: shouldCalculateWage ? employee.wageAmount : 0,
        calculatedWage: calculatedWage
      },
      create: {
        employeeId: employeeId,
        date: date,
        status: status,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        workMinutes: workMinutes,
        wageType: shouldCalculateWage ? employee.wageType : 'NONE',
        wageAmount: shouldCalculateWage ? employee.wageAmount : 0,
        calculatedWage: calculatedWage
      }
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('[API Manual Attendance POST Error]:', error);
    return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
  }
}
