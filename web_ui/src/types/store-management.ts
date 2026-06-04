export type StoreSummary = {
  id: string;
  name: string;
  address?: string | null;
  contact?: string | null;
  representativeName?: string | null;
  businessRegNo?: string | null;
  wifiIpAddress?: string | null;
  currency?: string | null;
  timeZone?: string | null;
  status?: string | null;
};

export type EmployeeStoreSummary = Pick<StoreSummary, "currency" | "timeZone">;

export type UserSearchResult = {
  id: string;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
};

export type BlacklistReport = {
  id: string;
  reason: string;
  reporterId: string;
  reporterName?: string | null;
  createdAt: string;
};

export type BlacklistEntry = {
  phoneNumber: string;
  count: number;
  latestDate: string;
  reports: BlacklistReport[];
};

export type EmployeeUser = {
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
};

export type EmployeeHistory = {
  id: string;
  joinedAt: string;
  resignedAt?: string | null;
};

export type EmployeeRow = {
  id: string;
  role: string;
  status: string;
  wageType: string;
  wageAmount: number;
  workStartTime: string;
  workEndTime: string;
  user: EmployeeUser;
  store?: EmployeeStoreSummary | null;
  histories?: EmployeeHistory[];
};

export type EmployeeEditForm = {
  role: string;
  wageType: string;
  wageAmount: number;
  workStartTime: string;
  workEndTime: string;
};

export type AttendanceStat = {
  id: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: string;
  workMinutes: number;
  wageType: string;
  wageAmount: number;
  calculatedWage?: number | null;
};
