'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, ClipboardCheck, Edit3, LoaderCircle, Trash2, UserPlus, Wifi, Users } from 'lucide-react';
import { useI18n, useLocale } from '@/i18n/I18nProvider';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PageHeader from '@/components/layout/PageHeader';
import type { AttendanceStat, EmployeeRow } from '@/types/store-management';

const DEFAULT_TIME_ZONE =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';
const employeesMemoryCache = new Map<string, EmployeeRow[]>();
const EMPLOYEE_REFRESH_KEY = 'store_employees_force_refresh_store_id';

function resolveStoreTimeZone(timeZone?: string | null) {
  return timeZone && timeZone !== 'UTC' ? timeZone : DEFAULT_TIME_ZONE;
}

function displayName(employee: EmployeeRow) {
  return employee.user.name || employee.user.email?.split('@')[0] || '-';
}

function shortName(name: string) {
  return name.length > 10 ? `${name.slice(0, 10)}...` : name;
}

export default function StoreEmployeesPage() {
  const t = useI18n();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [statsMonth, setStatsMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [employeeStats, setEmployeeStats] = useState<AttendanceStat[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isWifiRegistering, setIsWifiRegistering] = useState(false);
  const [wifiStatusMessage, setWifiStatusMessage] = useState('');
  const [showResignedEmployees, setShowResignedEmployees] = useState(false);
  const lastLoadedStoreId = useRef('');

  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const selectedStoreTimeZone = resolveStoreTimeZone(selectedStore?.timeZone);
  const activeEmployees = employees.filter((employee) => employee.status !== 'INACTIVE');
  const resignedEmployees = employees.filter((employee) => employee.status === 'INACTIVE');

  const fetchEmployees = async (storeId: string, force = false) => {
    if (!force && employeesMemoryCache.has(storeId)) {
      setEmployees(employeesMemoryCache.get(storeId) ?? []);
      return;
    }

    try {
      const res = await fetch(`/api/store/employees?storeId=${storeId}`);
      if (res.ok) {
        const data = (await res.json()) as EmployeeRow[];
        employeesMemoryCache.set(storeId, data);
        setEmployees(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchEmployeeStats = async (employeeId: string, month: string) => {
    setIsStatsLoading(true);
    try {
      const res = await fetch(`/api/store/attendance?storeId=${selectedStoreId}&employeeId=${employeeId}&month=${month}`);
      if (res.ok) setEmployeeStats((await res.json()) as AttendanceStat[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    if (storesLoading) return;
    if (stores.length === 0) {
      setLoading(false);
      return;
    }

    const queryStoreId = searchParams.get('storeId') || '';
    const initialStoreId = stores.some((store) => store.id === queryStoreId) ? queryStoreId : selectedStoreId;
    const storeId = stores.some((store) => store.id === initialStoreId) ? initialStoreId : stores[0].id;
    const refreshStoreId = window.sessionStorage.getItem(EMPLOYEE_REFRESH_KEY);
    const shouldForceRefresh = refreshStoreId === storeId;

    setSelectedStoreId(storeId);
    if (lastLoadedStoreId.current === storeId && !shouldForceRefresh) return;
    if (shouldForceRefresh) {
      window.sessionStorage.removeItem(EMPLOYEE_REFRESH_KEY);
      employeesMemoryCache.delete(storeId);
    }
    lastLoadedStoreId.current = storeId;
    setLoading(!employeesMemoryCache.has(storeId));
    void fetchEmployees(storeId, shouldForceRefresh).finally(() => setLoading(false));
  }, [selectedStoreId, stores, storesLoading, searchParams]);

  useEffect(() => {
    if (detailEmployeeId) void fetchEmployeeStats(detailEmployeeId, statsMonth);
  }, [statsMonth]);

  const { refreshing } = usePullToRefresh({
    disabled: storesLoading || stores.length === 0 || !selectedStoreId,
    onRefresh: async () => {
      if (!selectedStoreId) return;
      await fetchEmployees(selectedStoreId, true);
    },
  });

  const toggleAttendance = (employeeId: string) => {
    if (detailEmployeeId === employeeId) {
      setDetailEmployeeId(null);
      setEmployeeStats([]);
      return;
    }

    setDetailEmployeeId(employeeId);
    void fetchEmployeeStats(employeeId, statsMonth);
  };

  const registerWifiIp = async () => {
    if (!selectedStoreId || isWifiRegistering) return;
    setIsWifiRegistering(true);
    setWifiStatusMessage('근태관리를 위한 매장의 아이피를 등록중입니다.');
    const startedAt = Date.now();
    try {
      const res = await fetch('/api/store/wifi-ip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStoreId }),
      });
      if (!res.ok) {
        const data = await res.json();
        const message = data.error || '아이피 등록에 실패했습니다.';
        setWifiStatusMessage(message);
        alert(message);
        return;
      }
      const data = await res.json();
      const remain = Math.max(0, 2000 - (Date.now() - startedAt));
      await new Promise((resolve) => window.setTimeout(resolve, remain));
      setWifiStatusMessage(`등록되었습니다.\n등록 아이피 : ${data.wifiIpAddress || '-'}`);
    } catch {
      setWifiStatusMessage('아이피 등록 중 오류가 발생했습니다.');
      alert('아이피 등록 중 오류가 발생했습니다.');
    } finally {
      setIsWifiRegistering(false);
      window.setTimeout(() => setWifiStatusMessage(''), 2500);
    }
  };

  const renderEmployeeCard = (employee: EmployeeRow) => {
    const expanded = detailEmployeeId === employee.id;
    const inactive = employee.status === 'INACTIVE';
    const isFullManagement = employee.managementMode === 'FULL';
    const totalMinutes = employeeStats.reduce((sum, row) => sum + (row.workMinutes || 0), 0);
    const estimatedWage = employee.wageType === 'MONTHLY'
      ? employee.wageAmount
      : employeeStats.reduce((sum, row) => sum + (row.calculatedWage || 0), 0);

    return (
      <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className={`p-4 flex items-center gap-3 ${inactive ? 'bg-gray-100' : 'bg-white'}`}>
          <button
            type="button"
            onClick={() => toggleAttendance(employee.id)}
            className="shrink-0 text-gray-400"
            title={t.emp_stats_view}
          >
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => toggleAttendance(employee.id)}
            className="min-w-0 flex-1 text-left"
          >
            <span className={`block truncate font-bold text-lg ${inactive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {shortName(displayName(employee))}
            </span>
            <span className="block truncate text-xs text-gray-500">
              {employee.phoneNumber || employee.user.email}
            </span>
          </button>
          {inactive ? (
            <span className="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded">
              {t.emp_badge_resigned}
            </span>
          ) : null}
          {!inactive ? (
            <div className="shrink-0 flex items-center gap-1">
              <Link
                href={`/store/employees/${employee.id}/edit?storeId=${selectedStoreId}`}
                prefetch={false}
                className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                title={t.mypage_edit}
              >
                <Edit3 className="w-5 h-5" />
              </Link>
              <Link
                href={`/store/employees/${employee.id}/resign?storeId=${selectedStoreId}`}
                prefetch={false}
                className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                title={t.mypage_withdraw}
              >
                <Trash2 className="w-5 h-5" />
              </Link>
            </div>
          ) : null}
        </div>

        {expanded ? (
          <div className="p-4 bg-gray-50/80 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm">{t.emp_work_history}</h3>
              <input
                type="month"
                value={statsMonth}
                onChange={(event) => setStatsMonth(event.target.value)}
                className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>

            {isStatsLoading ? (
              <div className="py-8 text-center text-gray-500 text-sm">{t.mypage_loading}</div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">{t.emp_stats_date}</th>
                        <th className="px-4 py-2 font-semibold">{t.emp_stats_check_in}</th>
                        <th className="px-4 py-2 font-semibold">{t.emp_stats_check_out}</th>
                        <th className="px-4 py-2 font-semibold">{t.emp_stats_status}</th>
                        {isFullManagement ? (
                          <th className="px-4 py-2 font-semibold text-right">{t.emp_stats_daily_wage}</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {employeeStats.length === 0 ? (
                        <tr>
                          <td colSpan={isFullManagement ? 5 : 4} className="px-4 py-6 text-center text-gray-400">{t.emp_no_history}</td>
                        </tr>
                      ) : (
                        employeeStats.map((att) => (
                          <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-900 font-medium">{att.date}</td>
                            <td className="px-4 py-3 text-gray-600">{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: selectedStoreTimeZone }) : '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: selectedStoreTimeZone }) : '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                                att.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                                att.status === 'LATE' ? 'bg-red-100 text-red-700' :
                                att.status === 'EARLY_LEAVE' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {att.status === 'NORMAL' ? t.emp_status_normal : att.status === 'LATE' ? t.emp_status_late : att.status === 'EARLY_LEAVE' ? t.emp_status_early : t.emp_status_absent}
                              </span>
                            </td>
                            {isFullManagement ? (
                              <td className="px-4 py-3 text-right font-bold text-indigo-600">
                                {att.calculatedWage != null ? `${att.calculatedWage.toLocaleString()}${employee.store?.currency || 'VND'}` : '-'}
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {isFullManagement ? (
                  <div className="mt-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-indigo-800">{t.emp_stats_salary_summary}</span>
                    <div className="text-right">
                      <div className="text-xs text-indigo-600 mb-1">
                        {t.emp_total_work_time
                          .replace('{h}', String(Math.floor(totalMinutes / 60)))
                          .replace('{m}', String(totalMinutes % 60))}
                      </div>
                      <div className="text-lg font-black text-indigo-900">
                        {t.emp_expected_salary} {Math.floor(estimatedWage).toLocaleString()}{employee.store?.currency || 'VND'}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  if (!storesLoading && stores.length === 0) {
    return <StoreRequiredNotice />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={t.employee_management}
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={(
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void registerWifiIp()}
              disabled={!selectedStoreId || isWifiRegistering}
              className="p-2 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
              title="현재 공유기 등록"
            >
              {isWifiRegistering ? <LoaderCircle className="w-6 h-6 animate-spin" /> : <Wifi className="w-6 h-6" />}
            </button>
            <Link
              href={`/store/employees/new${selectedStoreId ? `?storeId=${selectedStoreId}` : ''}`}
              prefetch={false}
              className="text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
              title="직원 추가"
            >
              <UserPlus className="w-6 h-6" />
            </Link>
          </div>
        )}
      />

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
        {refreshing && (
          <div className="rounded-xl bg-indigo-50 px-4 py-2 text-center text-xs font-bold text-indigo-600">
            {t.mypage_loading}
          </div>
        )}

        {wifiStatusMessage ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-center text-sm font-bold text-indigo-700 border border-indigo-100 whitespace-pre-line">
            {isWifiRegistering ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            {wifiStatusMessage}
          </div>
        ) : null}

        {stores.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  setSelectedStoreId(store.id);
                  setDetailEmployeeId(null);
                  setEmployeeStats([]);
                  void fetchEmployees(store.id);
                }}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedStoreId === store.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-bold text-lg text-gray-900 flex items-center mb-4">
            <Users className="w-5 h-5 mr-2 text-indigo-500" /> {t.emp_list_title} ({activeEmployees.length})
          </h2>

          {storesLoading || loading ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              {t.mypage_loading}
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              {t.emp_empty_list}
            </div>
          ) : (
            activeEmployees.map((employee) => {
              const expanded = detailEmployeeId === employee.id;
              const inactive = employee.status === 'INACTIVE';
              const isFullManagement = employee.managementMode === 'FULL';
              const totalMinutes = employeeStats.reduce((sum, row) => sum + (row.workMinutes || 0), 0);
              const estimatedWage = employee.wageType === 'MONTHLY'
                ? employee.wageAmount
                : employeeStats.reduce((sum, row) => sum + (row.calculatedWage || 0), 0);

              return (
                <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className={`p-4 flex items-center gap-3 ${inactive ? 'bg-gray-100' : 'bg-white'}`}>
                    <button
                      type="button"
                      onClick={() => toggleAttendance(employee.id)}
                      className="shrink-0 text-gray-400"
                      title={t.emp_stats_view}
                    >
                      {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAttendance(employee.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className={`block truncate font-bold text-lg ${inactive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {shortName(displayName(employee))}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {employee.phoneNumber || employee.user.email}
                      </span>
                    </button>
                    {inactive ? (
                      <span className="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded">
                        {t.emp_badge_resigned}
                      </span>
                    ) : null}
                    {!inactive ? (
                      <div className="shrink-0 flex items-center gap-1">
                        <Link
                          href={`/store/employees/${employee.id}/edit?storeId=${selectedStoreId}`}
                          prefetch={false}
                          className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                          title={t.mypage_edit}
                        >
                          <Edit3 className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/store/employees/${employee.id}/resign?storeId=${selectedStoreId}`}
                          prefetch={false}
                          className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                          title={t.mypage_withdraw}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div className="p-4 bg-gray-50/80 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 text-sm">{t.emp_work_history}</h3>
                        <input
                          type="month"
                          value={statsMonth}
                          onChange={(event) => setStatsMonth(event.target.value)}
                          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none"
                        />
                      </div>

                      {isStatsLoading ? (
                        <div className="py-8 text-center text-gray-500 text-sm">{t.mypage_loading}</div>
                      ) : (
                        <>
                          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                  <th className="px-4 py-2 font-semibold">{t.emp_stats_date}</th>
                                  <th className="px-4 py-2 font-semibold">{t.emp_stats_check_in}</th>
                                  <th className="px-4 py-2 font-semibold">{t.emp_stats_check_out}</th>
                                  <th className="px-4 py-2 font-semibold">{t.emp_stats_status}</th>
                                  {isFullManagement ? (
                                    <th className="px-4 py-2 font-semibold text-right">{t.emp_stats_daily_wage}</th>
                                  ) : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {employeeStats.length === 0 ? (
                                  <tr>
                                    <td colSpan={isFullManagement ? 5 : 4} className="px-4 py-6 text-center text-gray-400">{t.emp_no_history}</td>
                                  </tr>
                                ) : (
                                  employeeStats.map((att) => (
                                    <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-gray-900 font-medium">{att.date}</td>
                                      <td className="px-4 py-3 text-gray-600">{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: selectedStoreTimeZone }) : '-'}</td>
                                      <td className="px-4 py-3 text-gray-600">{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: selectedStoreTimeZone }) : '-'}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                                          att.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                                          att.status === 'LATE' ? 'bg-red-100 text-red-700' :
                                          att.status === 'EARLY_LEAVE' ? 'bg-orange-100 text-orange-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {att.status === 'NORMAL' ? t.emp_status_normal : att.status === 'LATE' ? t.emp_status_late : att.status === 'EARLY_LEAVE' ? t.emp_status_early : t.emp_status_absent}
                                        </span>
                                      </td>
                                      {isFullManagement ? (
                                        <td className="px-4 py-3 text-right font-bold text-indigo-600">
                                          {att.calculatedWage != null ? `${att.calculatedWage.toLocaleString()}${employee.store?.currency || 'VND'}` : '-'}
                                        </td>
                                      ) : null}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          {isFullManagement ? (
                            <div className="mt-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                              <span className="text-sm font-bold text-indigo-800">{t.emp_stats_salary_summary}</span>
                              <div className="text-right">
                                <div className="text-xs text-indigo-600 mb-1">
                                  {t.emp_total_work_time
                                    .replace('{h}', String(Math.floor(totalMinutes / 60)))
                                    .replace('{m}', String(totalMinutes % 60))}
                                </div>
                                <div className="text-lg font-black text-indigo-900">
                                  {t.emp_expected_salary} {Math.floor(estimatedWage).toLocaleString()}{employee.store?.currency || 'VND'}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {resignedEmployees.length > 0 ? (
            <section className="pt-4">
              <button
                type="button"
                onClick={() => setShowResignedEmployees((value) => !value)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm"
              >
                <span className="font-bold text-gray-800">퇴사자 직원 ({resignedEmployees.length})</span>
                {showResignedEmployees ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showResignedEmployees ? (
                <div className="mt-3 space-y-3">
                  {resignedEmployees.map(renderEmployeeCard)}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
