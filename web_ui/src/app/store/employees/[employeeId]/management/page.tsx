'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import PageHeader from '@/components/layout/PageHeader';
import type { EmployeeEditForm, EmployeeRow } from '@/types/store-management';

function displayName(employee?: EmployeeRow | null) {
  if (!employee) return '';
  return employee.user.name || employee.user.email?.split('@')[0] || '-';
}

export default function EmployeeManagementPage() {
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
    managementMode: 'ATTENDANCE_ONLY',
    wageType: 'HOURLY',
    wageAmount: 0,
    workStartTime: '09:00',
    workEndTime: '18:00',
  });

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
            managementMode: found.managementMode || 'ATTENDANCE_ONLY',
            wageType: found.wageType || 'HOURLY',
            wageAmount: found.wageAmount || 0,
            workStartTime: found.workStartTime || '09:00',
            workEndTime: found.workEndTime || '18:00',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void loadEmployee();
  }, [employeeId, storeId]);

  const saveManagement = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/store/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          ...form,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || t.emp_error_msg);
        return;
      }
      alert(t.emp_update_success);
      window.sessionStorage.setItem('store_employees_force_refresh_store_id', storeId);
      router.replace(`/store/employees/${employeeId}/edit?storeId=${encodeURIComponent(storeId)}`);
    } catch {
      alert(t.emp_error_msg);
    } finally {
      setSaving(false);
    }
  };

  if (!storesLoading && stores.length === 0) return <StoreRequiredNotice />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <PageHeader
        title="관리방식"
        subtitle={loading ? t.mypage_loading : displayName(employee)}
        icon={<SlidersHorizontal className="h-5 w-5" />}
      />

      <div className="mx-auto mt-6 max-w-2xl px-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
            {t.mypage_loading}
          </div>
        ) : !employee ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
            {t.emp_empty_list}
          </div>
        ) : (
          <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-bold text-gray-900">관리방식</h2>
              <p className="mt-1 text-xs font-semibold text-gray-500">
                기본값은 출퇴근 관리입니다. 급여 계산까지 필요할 때만 전체관리로 변경해주세요.
              </p>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-600">{t.emp_form_wage_type}</span>
                  <select
                    value={form.wageType}
                    onChange={(event) => setForm({ ...form, wageType: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="HOURLY">{t.emp_wage_hourly}</option>
                    <option value="DAILY">{t.emp_wage_daily}</option>
                    <option value="MONTHLY">{t.emp_wage_monthly}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-600">
                    {t.emp_form_wage_amount} ({employee.store?.currency || 'VND'})
                  </span>
                  <input
                    type="number"
                    value={form.wageAmount}
                    onChange={(event) => setForm({ ...form, wageAmount: Number(event.target.value) })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-600">{t.emp_form_start_time}</span>
                  <input
                    type="time"
                    value={form.workStartTime}
                    onChange={(event) => setForm({ ...form, workStartTime: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-gray-600">{t.emp_form_end_time}</span>
                  <input
                    type="time"
                    value={form.workEndTime}
                    onChange={(event) => setForm({ ...form, workEndTime: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ) : (
              <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                {t.emp_mode_attendance_only_desc}
              </p>
            )}

            <Button type="button" onClick={saveManagement} disabled={saving} className="h-11 w-full">
              {saving ? t.mypage_saving : t.emp_form_update}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
