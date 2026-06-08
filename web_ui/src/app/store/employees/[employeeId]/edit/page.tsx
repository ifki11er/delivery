'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ClipboardCheck, Save } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { EmployeeHistoryList } from '@/components/store/EmployeeHistoryList';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import PageHeader from '@/components/layout/PageHeader';
import type { EmployeeEditForm, EmployeeRow } from '@/types/store-management';

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
  const router = useRouter();
  const params = useParams<{ employeeId: string }>();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const employeeId = params.employeeId;
  const [storeId, setStoreId] = useState(searchParams.get('storeId') || '');
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeEditForm>({
    managementMode: 'FULL',
    wageType: 'HOURLY',
    wageAmount: 0,
    workStartTime: '09:00',
    workEndTime: '18:00',
  });
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
        const found = rows.find((row) => row.id === employeeId) ?? null;
        setEmployee(found);
        if (found) {
          setForm({
            managementMode: found.managementMode || 'FULL',
            wageType: found.wageType,
            wageAmount: found.wageAmount,
            workStartTime: found.workStartTime,
            workEndTime: found.workEndTime,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void loadEmployee();
  }, [employeeId, storeId]);

  const saveEmployee = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/store/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, ...form }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || t.emp_error_msg);
        return;
      }
      alert(t.emp_update_success);
      router.replace('/store/employees');
    } catch {
      alert(t.emp_error_msg);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={loading ? t.mypage_loading : displayName(employee)}
        subtitle={employee?.user.phoneNumber || employee?.user.email || ''}
        icon={<ClipboardCheck className="w-5 h-5" />}
      />

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
            {t.mypage_loading}
          </div>
        ) : !employee ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
            {t.emp_empty_list}
          </div>
        ) : (
          <>
            <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-600 mb-2">관리방식</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, managementMode: 'ATTENDANCE_ONLY' })}
                  className={`h-11 rounded-lg text-sm font-black transition-colors ${
                    form.managementMode === 'ATTENDANCE_ONLY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {t.emp_mode_attendance_only}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, managementMode: 'FULL' })}
                  className={`h-11 rounded-lg text-sm font-black transition-colors ${
                    form.managementMode === 'FULL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {t.emp_mode_full}
                </button>
              </div>

              {form.managementMode === 'FULL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_wage_type}</span>
                    <select
                      value={form.wageType}
                      onChange={(event) => setForm({ ...form, wageType: event.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="HOURLY">{t.emp_wage_hourly}</option>
                      <option value="DAILY">{t.emp_wage_daily}</option>
                      <option value="MONTHLY">{t.emp_wage_monthly}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_wage_amount} ({employee.store?.currency || '₫'})</span>
                    <input
                      type="number"
                      value={form.wageAmount}
                      onChange={(event) => setForm({ ...form, wageAmount: Number(event.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_start_time}</span>
                    <input
                      type="time"
                      value={form.workStartTime}
                      onChange={(event) => setForm({ ...form, workStartTime: event.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_end_time}</span>
                    <input
                      type="time"
                      value={form.workEndTime}
                      onChange={(event) => setForm({ ...form, workEndTime: event.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                </div>
              ) : (
                <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                  {t.emp_mode_attendance_only_desc}
                </p>
              )}
              <Button type="button" onClick={saveEmployee} disabled={saving} className="w-full h-11" icon={<Save className="w-4 h-4" />}>
                {saving ? t.mypage_saving : t.emp_form_update}
              </Button>
            </section>

            <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-3">{t.emp_manual_title}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_date_select}</span>
                  <input
                    type="date"
                    value={manualRecord.date}
                    onChange={(event) => setManualRecord({ ...manualRecord, date: event.target.value })}
                    className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_manual_status}</span>
                  <select
                    value={manualRecord.status}
                    onChange={(event) => setManualRecord({ ...manualRecord, status: event.target.value })}
                    className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <option value="NORMAL">{t.emp_status_normal}</option>
                    <option value="LATE">{t.emp_status_late}</option>
                    <option value="EARLY_LEAVE">{t.emp_status_early}</option>
                    <option value="ABSENT">{t.emp_status_absent}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_manual_check_in}</span>
                  <input
                    type="time"
                    value={manualRecord.checkIn}
                    disabled={manualRecord.status === 'ABSENT'}
                    onChange={(event) => setManualRecord({ ...manualRecord, checkIn: event.target.value })}
                    className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg disabled:bg-gray-100"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_manual_check_out}</span>
                  <input
                    type="time"
                    value={manualRecord.checkOut}
                    disabled={manualRecord.status === 'ABSENT'}
                    onChange={(event) => setManualRecord({ ...manualRecord, checkOut: event.target.value })}
                    className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg disabled:bg-gray-100"
                  />
                </label>
              </div>
              <Button type="button" onClick={saveManualAttendance} className="w-full h-11 mt-4">
                {t.emp_manual_save}
              </Button>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <EmployeeHistoryList histories={employee.histories ?? []} t={t} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
