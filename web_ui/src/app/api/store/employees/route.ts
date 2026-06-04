import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    const isManager = await prisma.employee.findFirst({
      where: { storeId, userId: session.user.id, role: 'MANAGER', status: 'ACTIVE' }
    });
    if (!store || (store.ownerId !== session.user.id && session.user.role !== 'ADMIN' && !isManager)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
      where: { storeId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true }
        },
        store: {
          select: { currency: true }
        },
        histories: {
          orderBy: { joinedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { storeId, phoneNumber, role, wageType, wageAmount, workStartTime, workEndTime } = body;

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    const isManager = await prisma.employee.findFirst({
      where: { storeId, userId: session.user.id, role: 'MANAGER', status: 'ACTIVE' }
    });
    if (!store || (store.ownerId !== session.user.id && session.user.role !== 'ADMIN' && !isManager)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!targetUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다. 앱에 가입되어 있고 온보딩을 마쳤는지 확인해주세요.' }, { status: 404 });
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: { storeId, userId: targetUser.id }
    });

    if (existingEmployee) {
      if (existingEmployee.status === 'INACTIVE') {
        // 재입사 (복직) 처리
        const resurrectedEmployee = await prisma.employee.update({
          where: { id: existingEmployee.id },
          data: {
            status: 'ACTIVE',
            role: role || 'STAFF',
            wageType: wageType || 'HOURLY',
            wageAmount: wageAmount || 0,
            workStartTime: workStartTime || '09:00',
            workEndTime: workEndTime || '18:00',
            histories: {
              create: {}
            }
          },
          include: {
            user: { select: { id: true, name: true, email: true, phoneNumber: true } }
          }
        });
        return NextResponse.json(resurrectedEmployee);
      }
      return NextResponse.json({ error: '이미 이 상점에 재직 중인 직원입니다.' }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: {
        storeId,
        userId: targetUser.id,
        role: role || 'STAFF',
        wageType: wageType || 'HOURLY',
        wageAmount: wageAmount || 0,
        workStartTime: workStartTime || '09:00',
        workEndTime: workEndTime || '18:00',
        histories: {
          create: {}
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, phoneNumber: true } }
      }
    });

    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { employeeId, role, wageType, wageAmount, workStartTime, workEndTime, status } = body;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { store: true }
    });

    const isManager = employee ? await prisma.employee.findFirst({
      where: { storeId: employee.storeId, userId: session.user.id, role: 'MANAGER', status: 'ACTIVE' }
    }) : null;

    if (!employee || (employee.store.ownerId !== session.user.id && session.user.role !== 'ADMIN' && !isManager)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        role: role !== undefined ? role : undefined,
        wageType: wageType !== undefined ? wageType : undefined,
        wageAmount: wageAmount !== undefined ? wageAmount : undefined,
        workStartTime: workStartTime !== undefined ? workStartTime : undefined,
        workEndTime: workEndTime !== undefined ? workEndTime : undefined,
        status: status !== undefined ? status : undefined,
      }
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { store: true }
    });

    const isManager = employee ? await prisma.employee.findFirst({
      where: { storeId: employee.storeId, userId: session.user.id, role: 'MANAGER', status: 'ACTIVE' }
    }) : null;

    if (!employee || (employee.store.ownerId !== session.user.id && session.user.role !== 'ADMIN' && !isManager)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const activeHistory = await prisma.employmentHistory.findFirst({
      where: { employeeId, resignedAt: null },
      orderBy: { joinedAt: 'desc' }
    });

    if (activeHistory) {
      await prisma.employmentHistory.update({
        where: { id: activeHistory.id },
        data: { resignedAt: new Date() }
      });
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'INACTIVE' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
