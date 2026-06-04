import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth();

  // 1. 보안: ADMIN 권한이 없으면 메인으로 튕겨냅니다.
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // 2. 데이터 페칭 (통계 포함)
  const [
    totalUsers, 
    activeUsers, 
    suspendedUsers,
    withdrawnUsers,
    adminUsers,
    ownerUsers,
    customerUsers,
    totalEmployees,
    activeStores,
    suspendedStores,
    closedStores,
    allApps, 
    allBlacklists
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count({ where: { OR: [{ status: 'WITHDRAWN' }, { deletedAt: { not: null } }] } }),
    prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
    prisma.user.count({ where: { role: 'OWNER', deletedAt: null } }),
    prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
    prisma.employee.count(),
    prisma.store.count({ where: { status: 'ACTIVE' } }),
    prisma.store.count({ where: { status: 'SUSPENDED' } }),
    prisma.store.count({ where: { status: 'CLOSED' } }),
    prisma.businessApplication.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.blacklist.findMany({
      include: {
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 3. 클라이언트 컴포넌트로 데이터 전달
  const stats = {
    users: { 
      total: totalUsers, 
      active: activeUsers, 
      suspended: suspendedUsers,
      withdrawn: withdrawnUsers,
      admins: adminUsers,
      owners: ownerUsers,
      customers: customerUsers,
      employees: totalEmployees
    },
    stores: { active: activeStores, suspended: suspendedStores, closed: closedStores, pending: allApps.filter((a: any) => a.status === 'PENDING').length }
  };

  return (
    <AdminClient 
      stats={stats}
      allApps={allApps} 
      allBlacklists={allBlacklists} 
    />
  );
}
