'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardCheck, Search } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import PageHeader from '@/components/layout/PageHeader';
import type { EmployeeRow, UserSearchResult } from '@/types/store-management';

export default function AddEmployeePage() {
  const t = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState(searchParams.get('storeId') || '');
  const [phone, setPhone] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storesLoading && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores, storesLoading]);

  const registerEmployee = async () => {
    if (!phone) return alert(t.emp_phone_required);
    setSaving(true);
    try {
      const searchRes = await fetch(`/api/user/search?phone=${phone}`);
      if (!searchRes.ok) {
        const err = await searchRes.json();
        alert(err.error || t.emp_user_not_found);
        setSelectedUser(null);
        return;
      }
      const user = (await searchRes.json()) as UserSearchResult;
      setSelectedUser(user);

      const res = await fetch('/api/store/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStoreId,
          phoneNumber: phone,
          managementMode: 'FULL',
          wageType: 'HOURLY',
          wageAmount: 10000,
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
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader title={t.emp_register_title} icon={<ClipboardCheck className="w-5 h-5" />} />
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          {stores.length > 1 ? (
            <select
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">{t.emp_phone_placeholder}</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setSelectedUser(null);
                }}
                placeholder={t.emp_phone_placeholder}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t.emp_search_hint}</p>
          </div>

          {selectedUser ? (
            <div className="p-3 bg-indigo-50 rounded-lg">
              <p className="font-bold text-indigo-900">{selectedUser.name || selectedUser.email}</p>
              <p className="text-xs text-indigo-700">{selectedUser.phoneNumber}</p>
            </div>
          ) : null}

          <Button
            type="button"
            onClick={registerEmployee}
            disabled={!selectedStoreId || saving}
            className="w-full h-12"
          >
            {saving ? t.processing : t.emp_add_btn}
          </Button>
        </section>
      </div>
    </div>
  );
}
