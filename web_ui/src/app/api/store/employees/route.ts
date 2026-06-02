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
    if (!store || (store.ownerId !== session.user.id && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
      where: { storeId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
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
    const { storeId, email, role, wageType, wageAmount, workStartTime, workEndTime } = body;

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found. Please ensure they have signed up.' }, { status: 404 });
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: { storeId, userId: targetUser.id }
    });

    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee already exists in this store' }, { status: 400 });
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
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
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

    if (!employee || employee.store.ownerId !== session.user.id) {
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

    if (!employee || employee.store.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.employee.delete({
      where: { id: employeeId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
