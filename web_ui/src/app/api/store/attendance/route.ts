import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonError, readJson } from "@/lib/api";
import { getDateKeyInTimeZone, getMinutesInTimeZone } from "@/lib/time-zone";

type AttendanceAction = "CHECK_IN" | "CHECK_OUT";

function getMinutesDiff(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

function timeStringToMinutes(timeStr: string) {
  const [hours = 0, minutes = 0] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isAttendanceAction(action: unknown): action is AttendanceAction {
  return action === "CHECK_IN" || action === "CHECK_OUT";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  try {
    const body = await readJson<{ action?: unknown }>(req);
    if (!isAttendanceAction(body?.action)) {
      return jsonError("Invalid attendance action", 400);
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: { store: true },
      orderBy: { createdAt: "desc" },
    });

    if (!employee) {
      return jsonError("Active employee record not found.", 403);
    }

    const currentIp = getClientIp(req);
    if (currentIp === "unknown") {
      return jsonError("Could not determine request IP address.", 403);
    }

    if (!employee.store.wifiIpAddress) {
      return jsonError("Store Wi-Fi IP is not registered.", 403);
    }

    if (employee.store.wifiIpAddress !== currentIp) {
      return jsonError("Store Wi-Fi verification failed.", 403);
    }

    const now = new Date();
    const storeTimeZone = employee.store.timeZone;
    const dateStr = getDateKeyInTimeZone(now, storeTimeZone);

    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateStr,
        },
      },
    });

    const nowMinutes = getMinutesInTimeZone(now, storeTimeZone);
    const startExpected = timeStringToMinutes(employee.workStartTime);
    const endExpected = timeStringToMinutes(employee.workEndTime);

    if (body.action === "CHECK_IN") {
      if (attendance?.checkInTime) {
        return jsonError("Already checked in today.", 400);
      }

      attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: { employeeId: employee.id, date: dateStr },
        },
        update: {
          checkInTime: now,
          status: nowMinutes > startExpected ? "LATE" : "NORMAL",
          wageType: employee.wageType,
          wageAmount: employee.wageAmount,
        },
        create: {
          employeeId: employee.id,
          date: dateStr,
          checkInTime: now,
          status: nowMinutes > startExpected ? "LATE" : "NORMAL",
          wageType: employee.wageType,
          wageAmount: employee.wageAmount,
        },
      });
    } else {
      if (!attendance?.checkInTime) {
        return jsonError("Cannot check out before checking in.", 400);
      }
      if (attendance.checkOutTime) {
        return jsonError("Already checked out today.", 400);
      }

      const workMins = getMinutesDiff(attendance.checkInTime, now);
      const expectedMins = endExpected - startExpected;
      let calculatedWage: number | null = null;

      if (attendance.wageType === "HOURLY") {
        calculatedWage = Math.floor((workMins / 60) * attendance.wageAmount);
      }
      if (attendance.wageType === "DAILY") {
        calculatedWage =
          expectedMins > 0
            ? Math.floor((Math.min(workMins, expectedMins) / expectedMins) * attendance.wageAmount)
            : attendance.wageAmount;
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: now,
          workMinutes: workMins,
          status:
            nowMinutes < endExpected && attendance.status === "NORMAL"
              ? "EARLY_LEAVE"
              : attendance.status,
          calculatedWage,
        },
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("[Attendance POST Error]:", error);
    return jsonError("Failed to record attendance", 500);
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const month = searchParams.get("month");
    const queryEmployeeId = searchParams.get("employeeId");
    const includeToday = searchParams.get("includeToday") === "true";

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      include: { store: true },
      orderBy: { createdAt: "desc" },
    });

    if (!storeId && !employee) {
      return jsonError("No employee or store record found", 404);
    }

    const whereClause: Prisma.AttendanceWhereInput = {};

    if (storeId) {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      const isManager = await prisma.employee.findFirst({
        where: { storeId, userId: session.user.id, role: "MANAGER", status: "ACTIVE" },
      });

      if (!store || (store.ownerId !== session.user.id && session.user.role !== "ADMIN" && !isManager)) {
        return jsonError("Forbidden", 403);
      }

      whereClause.employee = { storeId };
      if (queryEmployeeId) whereClause.employeeId = queryEmployeeId;
    } else if (employee) {
      whereClause.employeeId = employee.id;
    }

    if (month) whereClause.date = { startsWith: month };

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { date: "desc" },
    });

    if (includeToday && !storeId && employee) {
      const todayDate = getDateKeyInTimeZone(new Date(), employee.store.timeZone);
      const todayAttendance = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayDate,
          },
        },
      });

      return NextResponse.json({ attendances, todayAttendance });
    }

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("[Attendance GET Error]:", error);
    return jsonError("Failed to fetch attendance", 500);
  }
}
