'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardCheck, KeyRound, Mail, Phone, Search, User } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import PageHeader from '@/components/layout/PageHeader';
import type { EmployeeRow } from '@/types/store-management';

export default function AddEmployeePage() {
  const t = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState(searchParams.get('storeId') || '');
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storesLoading && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores, storesLoading]);

  const registerEmployee = async () => {
    if (!selectedStoreId) return;
    if (!form.name || !form.phoneNumber || !form.email || !form.password) {
      alert('이름, 전화번호, 이메일, 비밀번호를 모두 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/store/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStoreId,
          name: form.name,
          phoneNumber: form.phoneNumber,
          email: form.email,
          password: form.password,
          managementMode: 'ATTENDANCE_ONLY',
          wageType: 'HOURLY',
          wageAmount: 0,
          workStartTime: '09:00',
          workEndTime: '18:00',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || t.emp_add_error);
        return;
      }
      const employee = (await res.json()) as EmployeeRow;
      router.replace(`/store/employees/${employee.id}/edit?storeId=${selectedStoreId}&created=1`);
    } catch {
      alert(t.emp_add_error);
    } finally {
      setSaving(false);
    }
  };

  if (!storesLoading && stores.length === 0) return <StoreRequiredNotice />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <PageHeader
        title="직원 등록"
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={(
          <>
            <span className="whitespace-nowrap text-[11px] font-medium text-gray-400">
              직원의 이력을 알아보세요
            </span>
            <Link
              href="/store/employees/history"
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="과거 근무 히스토리 검색"
            >
              <Search className="w-6 h-6" />
            </Link>
          </>
        )}
      />
      <div className="mx-auto mt-6 max-w-2xl space-y-4 px-4">
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {stores.length > 1 ? (
            <select
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          ) : null}

          <InputRow
            icon={<User className="w-5 h-5" />}
            label="직원 이름"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="직원 이름"
          />
          <InputRow
            icon={<Phone className="w-5 h-5" />}
            label="전화번호"
            value={form.phoneNumber}
            onChange={(value) => setForm((current) => ({ ...current, phoneNumber: value }))}
            placeholder="01012345678"
            type="tel"
          />
          <InputRow
            icon={<Mail className="w-5 h-5" />}
            label="직원 로그인 이메일"
            value={form.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="staff@example.com"
            type="email"
          />
          <InputRow
            icon={<KeyRound className="w-5 h-5" />}
            label="직원 로그인 비밀번호"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder="직원에게 전달할 비밀번호"
            type="password"
          />

          <Button
            type="button"
            onClick={registerEmployee}
            disabled={!selectedStoreId || saving}
            className="h-12 w-full"
          >
            {saving ? t.processing : t.emp_add_btn}
          </Button>
        </section>
      </div>
    </div>
  );
}

function InputRow({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-gray-600">{label}</span>
      <div className="relative">
        <div className="absolute left-3 top-3.5 text-gray-400">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </label>
  );
}
