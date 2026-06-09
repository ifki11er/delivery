'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Mail } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import PageHeader from '@/components/layout/PageHeader';
import type { EmployeeRow } from '@/types/store-management';

function displayName(employee?: EmployeeRow | null) {
  if (!employee) return '';
  return employee.user.name || employee.user.email?.split('@')[0] || '-';
}

export default function EmployeeAccountPage() {
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
  const [form, setForm] = useState({
    email: '',
    password: '',
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
          setForm({ email: found.user.email || '', password: '' });
        }
      } finally {
        setLoading(false);
      }
    };

    void loadEmployee();
  }, [employeeId, storeId]);

  const saveAccount = async () => {
    if (!form.email.trim()) {
      alert('직원 로그인 이메일을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/store/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          accountEmail: form.email,
          accountPassword: form.password,
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
        title="직원 로그인정보"
        subtitle={loading ? t.mypage_loading : displayName(employee)}
        icon={<KeyRound className="h-5 w-5" />}
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
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-600">로그인 이메일</span>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="staff@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-600">새 비밀번호</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="변경할 때만 입력"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-500">
                기존 비밀번호는 보안상 표시되지 않습니다. 새 비밀번호를 입력하면 재설정됩니다.
              </p>
            </label>

            <Button type="button" onClick={saveAccount} disabled={saving} className="h-11 w-full">
              {saving ? t.mypage_saving : t.emp_form_update}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
