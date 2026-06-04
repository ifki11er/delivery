import type { Role, StoreStatus, UserStatus } from "@prisma/client";

export type AdminStats = {
  users: {
    total: number;
    active: number;
    suspended: number;
    withdrawn: number;
    admins: number;
    owners: number;
    customers: number;
    employees: number;
  };
  stores: {
    active: number;
    suspended: number;
    closed: number;
    pending: number;
  };
};

export type AdminApplication = {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  };
  businessName: string;
  businessRegNo: string;
  representativeName: string | null;
  contact: string | null;
  address: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: Date;
};

export type AdminBlacklist = {
  id: string;
  phoneNumber: string;
  reason: string;
  reporter: {
    name: string | null;
    email: string | null;
  };
  createdAt: Date;
};

export type AdminStoreRow = {
  id: string;
  name: string;
  businessRegNo: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  phoneNumber: string | null;
  employeeCount: number;
  status: StoreStatus;
  createdAt: Date;
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: Role | "EMPLOYEE";
  storeName: string | null;
  status: UserStatus;
  deletedAt: Date | null;
  createdAt: Date;
};
