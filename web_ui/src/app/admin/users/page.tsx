import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserListClient from "./UserListClient";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "all";
  
  let usersData: any = [];
  
  // 조건에 따른 페칭
  if (filter === 'employee') {
    // 직원(알바생)의 경우 Employee 테이블 조회
    const employees = await prisma.employee.findMany({
      include: {
        user: true,
        store: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    // 통일된 포맷으로 매핑
    usersData = employees.map(emp => ({
      id: emp.user.id,
      name: emp.user.name,
      email: emp.user.email,
      phoneNumber: emp.user.phoneNumber,
      role: 'EMPLOYEE',
      storeName: emp.store.name,
      status: emp.user.status,
      deletedAt: emp.user.deletedAt,
      createdAt: emp.user.createdAt,
    }));
  } else {
    // 일반 유저 조회 조건
    let whereCondition: any = {};
    
    switch (filter) {
      case 'active':
        whereCondition = { status: 'ACTIVE', deletedAt: null };
        break;
      case 'suspended':
        whereCondition = { status: 'SUSPENDED' };
        break;
      case 'withdrawn':
        whereCondition = { OR: [{ status: 'WITHDRAWN' }, { deletedAt: { not: null } }] };
        break;
      case 'admin':
        whereCondition = { role: 'ADMIN', deletedAt: null };
        break;
      case 'owner':
        whereCondition = { role: 'OWNER', deletedAt: null };
        break;
      case 'customer':
        whereCondition = { role: 'CUSTOMER', deletedAt: null };
        break;
      default:
        // 'all'
        break;
    }

    const rawUsers = await prisma.user.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    });

    usersData = rawUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber,
      role: u.role,
      storeName: null,
      status: u.status,
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
    }));
  }

  return <UserListClient users={usersData} filterType={filter} />;
}
