import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import UserListClient from "./UserListClient";
import type { AdminUserRow } from "@/types/admin";

function toUserStatus(status?: string | null): UserStatus {
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "WITHDRAWN" || status === "INACTIVE") return "WITHDRAWN";
  return "ACTIVE";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "all";

  let usersData: AdminUserRow[] = [];

  if (filter === "employee") {
    const employees = await prisma.employee.findMany({
      include: {
        account: true,
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    usersData = employees.map((employee) => {
      const profile = employee.account;

      return {
        id: profile?.id ?? employee.id,
        name: profile?.name ?? null,
        email: profile?.email ?? null,
        phoneNumber: employee.phoneNumber ?? profile?.phoneNumber ?? null,
        role: "EMPLOYEE",
        storeName: employee.store.name,
        status: toUserStatus(employee.account?.status ?? employee.status),
        deletedAt: employee.account?.deletedAt ?? null,
        createdAt: profile?.createdAt ?? employee.createdAt,
      };
    });
  } else {
    let whereCondition: Prisma.UserWhereInput = {};

    switch (filter) {
      case "active":
        whereCondition = { status: "ACTIVE", deletedAt: null };
        break;
      case "suspended":
        whereCondition = { status: "SUSPENDED" };
        break;
      case "withdrawn":
        whereCondition = { OR: [{ status: "WITHDRAWN" }, { deletedAt: { not: null } }] };
        break;
      case "admin":
        whereCondition = { role: "ADMIN", deletedAt: null };
        break;
      case "owner":
        whereCondition = { role: "OWNER", deletedAt: null };
        break;
      case "customer":
        whereCondition = { role: "CUSTOMER", deletedAt: null };
        break;
      default:
        break;
    }

    const rawUsers = await prisma.user.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
    });

    usersData = rawUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      storeName: null,
      status: user.status,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
    }));
  }

  return <UserListClient users={usersData} filterType={filter} />;
}
