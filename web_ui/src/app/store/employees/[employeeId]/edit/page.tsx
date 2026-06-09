'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ClipboardCheck, MoreHorizontal } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { EmployeeHistoryList } from '@/components/store/EmployeeHistoryList';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import PageHeader from '@/components/layout/PageHeader';
import type { EmployeeRow } from '@/types/store-management';

function getLocalDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function displayName(employee?: EmployeeRow | null) {
  if (!employee) return '';
  return employee.user.name || employee.user.email?.split('@')[0] || '-';
}

export default function EditEmployeePage() {
  const t = useI18n();
  const params = useParams<{ employeeId: string }>();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const employeeId = params.employeeId;
  const [storeId, setStoreId] = useState(searchParams.get('storeId') || '');
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualRecord, setManualRecord] = useState({
    date: getLocalDateKey(new Date()),
    checkIn: '',
    checkOut: '',
    status: 'NORMAL',
  });

  const selectedStore = stores.find((store) => store.id === storeId);
  const timeZone = selectedStore?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  useEffect(() => {
    if (!storesLoading && stores.length > 0 && !storeId) {
      setStoreId(stores[0].id);
    }
  }, [storeId, stores, storesLoading]);

  useEffect(() => {
    if (!storeId || !employeeId) return;

    const loadEmployee = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/store/employees?storeId=${storeId}`);
        if (!res.ok) return;
        const rows = (await res.json()) as EmployeeRow[];
        setEmployee(rows.find((row) => row.id === employeeId) ?? null);
      } finally {
        setLoading(false);
      }
    };

    void loadEmployee();
  }, [employeeId, storeId]);

  const saveManualAttendance = async () => {
    if (!manualRecord.date) return;

    try {
      const res = await fetch('/api/store/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: manualRecord.date,
          checkInTimeStr: manualRecord.checkIn,
          checkOutTimeStr: manualRecord.checkOut,
          status: manualRecord.status,
          timeZone,
        }),
      });
      if (res.ok) {
        alert(t.emp_manual_success);
        setManualRecord((current) => ({ ...current, checkIn: '', checkOut: '', status: 'NORMAL' }));
      } else {
        const data = await res.json();
        alert(data.error || t.emp_generic_error);
      }
    } catch {
      alert(t.emp_error_msg);
    }
  };

  if (!storesLoading && stores.length === 0) return <StoreRequiredNotice />;

  const menuQuery = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <PageHeader
        title={loading ? t.mypage_loading : displayName(employee)}
        subtitle={employee?.phoneNumber || employee?.user.email || ''}
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={employee ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="직원 설정 메뉴"
            >
              <MoreHorizontal className="h-6 w-6" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 text-sm font-bold shadow-lg">
                <Link
                  href={`/store/employees/${employeeId}/account${menuQuery}`}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  직원 로그인정보
                </Link>
                <Link
                  href={`/store/employees/${employeeId}/management${menuQuery}`}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  관리방식
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      />

      <div className="mx-auto mt-6 max-w-2xl space-y-4 px-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
            {t.mypage_loading}
          </div>
        ) : !employee ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
            {t.emp_empty_list}
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-gray-900">{t.emp_manual_title}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold text-gray-500">{t.emp_date_select}</span>
                  <input
                    type="date"
                    value={manualRecord.date}
                    onChange={(event) => setManualRecord({ ...manualRecord, date: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold text-gray-500">{t.emp_manual_status}</span>
                  <select
                    value={manualRecord.status}
                    onChange={(event) => setManualRecord({ ...manualRecord, status: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm"
                  >
                    <option value="NORMAL">{t.emp_status_normal}</option>
                    <option value="LATE">{t.emp_status_late}</option>
                    <option value="EARLY_LEAVE">{t.emp_status_early}</option>
                    <option value="ABSENT">{t.emp_status_absent}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold text-gray-500">{t.emp_manual_check_in}</span>
                  <input
                    type="time"
                    value={manualRecord.checkIn}
                    disabled={manualRecord.status === 'ABSENT'}
                    onChange={(event) => setManualRecord({ ...manualRecord, checkIn: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm disabled:bg-gray-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold text-gray-500">{t.emp_manual_check_out}</span>
                  <input
                    type="time"
                    value={manualRecord.checkOut}
                    disabled={manualRecord.status === 'ABSENT'}
                    onChange={(event) => setManualRecord({ ...manualRecord, checkOut: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm disabled:bg-gray-100"
                  />
                </label>
              </div>
              <Button type="button" onClick={saveManualAttendance} className="mt-4 h-11 w-full">
                {t.emp_manual_save}
              </Button>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <EmployeeHistoryList histories={employee.histories ?? []} t={t} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
