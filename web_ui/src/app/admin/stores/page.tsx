import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import StoreListClient from "./StoreListClient";

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "all";
  
  let whereCondition: Prisma.StoreWhereInput = {};
  
  switch (filter) {
    case 'active':
      whereCondition = { status: 'ACTIVE' };
      break;
    case 'suspended':
      whereCondition = { status: 'SUSPENDED' };
      break;
    case 'closed':
      whereCondition = { status: 'CLOSED' };
      break;
    default:
      // 'all'
      break;
  }

  const stores = await prisma.store.findMany({
    where: whereCondition,
    include: {
      owner: true,
      _count: {
        select: { employees: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const storesData = stores.map(store => ({
    id: store.id,
    name: store.name,
    businessRegNo: store.businessRegNo,
    ownerName: store.owner.name,
    ownerEmail: store.owner.email,
    phoneNumber: store.contact || store.owner.phoneNumber,
    employeeCount: store._count.employees,
    status: store.status,
    createdAt: store.createdAt,
  }));

  return <StoreListClient stores={storesData} filterType={filter} />;
}
