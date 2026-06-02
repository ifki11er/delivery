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

  // 2. 데이터 페칭
  const [totalUsers, totalOwners, pendingApps] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "OWNER" } }),
    prisma.businessApplication.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 3. 클라이언트 컴포넌트로 데이터 전달
  return (
    <AdminClient 
      totalUsers={totalUsers} 
      totalOwners={totalOwners} 
      pendingApps={pendingApps} 
    />
  );
}
