import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

async function requireStoreAccess(storeId: string, userId: string, role?: string | null) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || (store.ownerId !== userId && role !== 'ADMIN')) return null;
  return store;
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function deletedEmployeeEmail(accountId: string, email: string) {
  return `deleted:${accountId}:${email}`;
}

const employeeInclude = {
  account: {
    select: { id: true, name: true, email: true, phoneNumber: true },
  },
  store: {
    select: { currency: true, timeZone: true },
  },
  histories: {
    orderBy: { joinedAt: 'desc' as const },
  },
};

function serializeEmployee<T extends {
  account: { id: string; name: string | null; email: string; phoneNumber: string };
  phoneNumber?: string | null;
}>(employee: T) {
  const { account, ...rest } = employee;

  return {
    ...rest,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      phoneNumber: employee.phoneNumber ?? account.phoneNumber,
    },
  };
}

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
    const store = await requireStoreAccess(storeId, session.user.id, session.user.role);
    if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const employees = await prisma.employee.findMany({
      where: { storeId },
      include: employeeInclude,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(employees.map(serializeEmployee));
  } catch (error) {
    console.error('[Store Employees GET Error]:', error);
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
    const storeId = typeof body?.storeId === 'string' ? body.storeId : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phoneNumber = normalizePhone(body?.phoneNumber);
    const normalizedMode = body?.managementMode === 'ATTENDANCE_ONLY' ? 'ATTENDANCE_ONLY' : 'FULL';

    if (!storeId || !email || !password || !name || !phoneNumber) {
      return NextResponse.json({ error: '이름, 전화번호, 이메일, 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }

    const store = await requireStoreAccess(storeId, session.user.id, session.user.role);
    if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [emailOwner, employeeEmailOwner] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.employeeAccount.findUnique({ where: { email } }),
    ]);

    if (emailOwner || (employeeEmailOwner && employeeEmailOwner.status !== 'WITHDRAWN')) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
    }

    const activeEmployeeWithSamePhone = await prisma.employee.findFirst({
      where: {
        storeId,
        phoneNumber,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (activeEmployeeWithSamePhone) {
      return NextResponse.json({ error: '이미 이 상점에 등록된 직원 전화번호입니다.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await prisma.$transaction(async (tx) => {
      if (employeeEmailOwner?.status === 'WITHDRAWN') {
        await tx.employeeAccount.update({
          where: { id: employeeEmailOwner.id },
          data: {
            email: deletedEmployeeEmail(employeeEmailOwner.id, email),
          },
        });
      }

      const targetAccount = await tx.employeeAccount.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phoneNumber,
        },
      });

      return tx.employee.create({
        data: {
          storeId,
          accountId: targetAccount.id,
          phoneNumber,
          managementMode: normalizedMode,
          wageType: body?.wageType || 'HOURLY',
          wageAmount: body?.wageAmount || 0,
          workStartTime: body?.workStartTime || '09:00',
          workEndTime: body?.workEndTime || '18:00',
          histories: { create: {} },
        },
        include: employeeInclude,
      });
    });

    return NextResponse.json(serializeEmployee(employee));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
    }

    console.error('[Store Employees POST Error]:', error);
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
    const { employeeId, managementMode, wageType, wageAmount, workStartTime, workEndTime, status } = body;
    const accountEmail = typeof body?.accountEmail === 'string' && body.accountEmail.trim()
      ? body.accountEmail.trim().toLowerCase()
      : undefined;
    const accountPassword = typeof body?.accountPassword === 'string' && body.accountPassword
      ? body.accountPassword
      : undefined;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { store: true, account: true },
    });

    if (!employee || (employee.store.ownerId !== session.user.id && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let reusableEmployeeEmailOwner: { id: string; status: string } | null = null;

    if (accountEmail && accountEmail !== employee.account.email) {
      const [emailOwner, employeeEmailOwner] = await Promise.all([
        prisma.user.findUnique({ where: { email: accountEmail } }),
        prisma.employeeAccount.findUnique({
          where: { email: accountEmail },
          select: { id: true, status: true },
        }),
      ]);
      if (emailOwner || (employeeEmailOwner && employeeEmailOwner.id !== employee.accountId && employeeEmailOwner.status !== 'WITHDRAWN')) {
        return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
      }
      if (employeeEmailOwner?.status === 'WITHDRAWN') {
        reusableEmployeeEmailOwner = employeeEmailOwner;
      }
    }

    const normalizedMode = managementMode === 'ATTENDANCE_ONLY'
      ? 'ATTENDANCE_ONLY'
      : managementMode === 'FULL'
        ? 'FULL'
        : undefined;

    const updatedEmployee = await prisma.$transaction(async (tx) => {
      if (accountEmail !== undefined || accountPassword) {
        if (accountEmail && reusableEmployeeEmailOwner) {
          await tx.employeeAccount.update({
            where: { id: reusableEmployeeEmailOwner.id },
            data: {
              email: deletedEmployeeEmail(reusableEmployeeEmailOwner.id, accountEmail),
            },
          });
        }

        await tx.employeeAccount.update({
          where: { id: employee.accountId },
          data: {
            email: accountEmail,
            password: accountPassword ? await bcrypt.hash(accountPassword, 10) : undefined,
          },
        });
      }

      return tx.employee.update({
        where: { id: employeeId },
        data: {
          managementMode: normalizedMode,
          wageType: wageType !== undefined ? wageType : undefined,
          wageAmount: wageAmount !== undefined ? wageAmount : undefined,
          workStartTime: workStartTime !== undefined ? workStartTime : undefined,
          workEndTime: workEndTime !== undefined ? workEndTime : undefined,
          status: status !== undefined ? status : undefined,
        },
        include: employeeInclude,
      });
    });

    return NextResponse.json(serializeEmployee(updatedEmployee));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
    }

    console.error('[Store Employees PUT Error]:', error);
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
    const requestedEmployeeId = searchParams.get('employeeId');
    if (!requestedEmployeeId && session.user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    let reason: string | null = null;
    let note: string | null = null;
    try {
      const body = await req.json();
      reason = typeof body?.reason === 'string' ? body.reason : null;
      note = typeof body?.note === 'string' ? body.note : null;
    } catch {
      // DELETE body is optional.
    }

    const employee = requestedEmployeeId
      ? await prisma.employee.findUnique({
          where: { id: requestedEmployeeId },
          include: { store: true, account: true },
        })
      : await prisma.employee.findFirst({
          where: {
            accountId: session.user.id,
            status: 'ACTIVE',
          },
          include: { store: true, account: true },
          orderBy: { createdAt: 'desc' },
        });

    const canManageStore = employee
      ? employee.store.ownerId === session.user.id || session.user.role === 'ADMIN'
      : false;
    const canResignSelf = employee
      ? session.user.role === 'EMPLOYEE' && employee.accountId === session.user.id
      : false;

    if (!employee || (!canManageStore && !canResignSelf)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const activeHistory = await prisma.employmentHistory.findFirst({
      where: { employeeId: employee.id, resignedAt: null },
      orderBy: { joinedAt: 'desc' },
    });

    await prisma.$transaction(async (tx) => {
      if (activeHistory) {
        await tx.employmentHistory.update({
          where: { id: activeHistory.id },
          data: {
            resignedAt: new Date(),
            resignationReason: reason,
            resignationNote: note,
          },
        });
      }

      await tx.employee.update({
        where: { id: employee.id },
        data: { status: 'INACTIVE' },
      });

      await tx.employeeAccount.update({
        where: { id: employee.accountId },
        data: {
          email: deletedEmployeeEmail(employee.accountId, employee.account.email),
          status: 'WITHDRAWN',
          deletedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Store Employees DELETE Error]:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
