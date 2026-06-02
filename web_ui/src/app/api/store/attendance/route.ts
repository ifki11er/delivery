import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Helper to calculate time difference in minutes
function getMinutesDiff(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

// Convert "HH:MM" string to minutes from midnight
function timeStringToMinutes(timeStr: string) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body; // 'CHECK_IN' or 'CHECK_OUT'

    // Get current IP address
    const headersList = await headers();
    let currentIp = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    // Handle proxy comma-separated list
    if (currentIp.includes(',')) {
      currentIp = currentIp.split(',')[0].trim();
    }

    // Find the employee record for the current user
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      include: { store: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'You are not registered as an active employee.' }, { status: 403 });
    }

    const store = employee.store;

    // IP Validation (Only if store has a configured Wi-Fi IP)
    // Note: In development, IP might be ::1 or 127.0.0.1, in production it will be public IP
    if (store.wifiIpAddress && store.wifiIpAddress !== currentIp) {
      return NextResponse.json({ 
        error: `Wi-Fi 인증 실패: 가게 공유기에 연결해주세요. (현재 IP: ${currentIp})` 
      }, { status: 403 });
    }

    // Get current date and time in local timezone context (server time, assumed KST/UTC+9 for now)
    const now = new Date();
    // A simple approach: use YYYY-MM-DD string as unique key per day
    const dateStr = now.toISOString().split('T')[0];

    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateStr
        }
      }
    });

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startExpected = timeStringToMinutes(employee.workStartTime);
    const endExpected = timeStringToMinutes(employee.workEndTime);

    if (action === 'CHECK_IN') {
      if (attendance?.checkInTime) {
        return NextResponse.json({ error: 'Already checked in today.' }, { status: 400 });
      }

      // Check if late (e.g. checked in after expected start time)
      const isLate = nowMinutes > startExpected;
      const status = isLate ? 'LATE' : 'NORMAL';

      attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: { employeeId: employee.id, date: dateStr }
        },
        update: {
          checkInTime: now,
          status,
        },
        create: {
          employeeId: employee.id,
          date: dateStr,
          checkInTime: now,
          status,
        }
      });
    } else if (action === 'CHECK_OUT') {
      if (!attendance?.checkInTime) {
        return NextResponse.json({ error: 'Cannot check out before checking in.' }, { status: 400 });
      }
      if (attendance.checkOutTime) {
        return NextResponse.json({ error: 'Already checked out today.' }, { status: 400 });
      }

      const workMins = getMinutesDiff(attendance.checkInTime, now);
      
      // Determine if early leave
      let status = attendance.status;
      if (nowMinutes < endExpected && status === 'NORMAL') {
        status = 'EARLY_LEAVE';
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: now,
          workMinutes: workMins,
          status,
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const month = searchParams.get('month'); // YYYY-MM

    // If fetching for an employee
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!storeId && !employee) {
      return NextResponse.json({ error: 'No employee or store record found' }, { status: 404 });
    }

    // Determine query context (Owner looking at store vs Employee looking at themselves)
    const whereClause: any = {};
    if (storeId) {
      // Check if user is owner
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (store?.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      whereClause.employee = { storeId };
    } else if (employee) {
      whereClause.employeeId = employee.id;
    }

    if (month) {
      whereClause.date = { startsWith: month };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(attendances);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
