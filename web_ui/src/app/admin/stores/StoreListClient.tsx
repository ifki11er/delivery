'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { StoreStatus } from '@prisma/client';
import { useI18n } from '@/i18n/I18nProvider';
import type { AdminStoreRow } from '@/types/admin';

export default function StoreListClient({ stores: initialStores, filterType }: { stores: AdminStoreRow[]; filterType: string }) {
  const t = useI18n();
  const [stores, setStores] = useState<AdminStoreRow[]>(initialStores);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleStatusChange = async (storeId: string, newStatus: StoreStatus) => {
    if (newStatus === 'CLOSED') {
      if (!confirm(t.admin_store_close_confirm)) return;
    } else if (!confirm(t.admin_store_status_confirm.replace('{status}', newStatus))) {
      return;
    }

    setLoadingId(storeId);
    try {
      const res = await fetch('/api/admin/stores/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, status: newStatus }),
      });

      if (res.ok) {
        alert(t.admin_store_status_changed);
        setStores(stores.map((s) => (s.id === storeId ? { ...s, status: newStatus } : s)));
        router.refresh();
      } else {
        const error = await res.json();
        alert(t.update_failed_with_error.replace('{error}', error.error));
      }
    } catch {
      alert(t.common_error);
    } finally {
      setLoadingId(null);
    }
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'active': return t.admin_active_stores;
      case 'suspended': return t.admin_suspended_stores;
      case 'closed': return t.admin_closed_stores;
      default: return t.admin_all_stores;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <Link href="/admin" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Store className="w-8 h-8 text-indigo-600" />
            {getFilterTitle()} {t.list_suffix}
          </h1>
          <p className="text-gray-500 mt-1">{t.admin_stores_count.replace('{count}', String(stores.length))}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-semibold">{t.manage_store_name}</th>
                <th className="py-4 px-6 font-semibold">{t.admin_owner_label}</th>
                <th className="py-4 px-6 font-semibold">{t.apply_form_biz_reg}</th>
                <th className="py-4 px-6 font-semibold">{t.manage_contact}</th>
                <th className="py-4 px-6 font-semibold">{t.admin_employee_count}</th>
                <th className="py-4 px-6 font-semibold">{t.admin_registered_at}</th>
                <th className="py-4 px-6 font-semibold">{t.admin_current_status_manage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">{t.admin_no_stores}</td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{store.name}</td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-gray-900">{store.ownerName || t.mypage_no_name}</p>
                      <p className="text-xs text-gray-500">{store.ownerEmail}</p>
                    </td>
                    <td className="py-4 px-6 text-gray-500">{store.businessRegNo || '-'}</td>
                    <td className="py-4 px-6 text-gray-500">{store.phoneNumber || '-'}</td>
                    <td className="py-4 px-6 font-medium text-gray-600">{store.employeeCount}{t.count_people}</td>
                    <td className="py-4 px-6 text-gray-500">{new Date(store.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {store.status === 'ACTIVE' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {store.status === 'SUSPENDED' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        {store.status === 'CLOSED' && <XCircle className="w-5 h-5 text-gray-400" />}
                        <select
                          value={store.status}
                          disabled={loadingId === store.id}
                          onChange={(e) => handleStatusChange(store.id, e.target.value as StoreStatus)}
                          className={`text-sm rounded-lg border-gray-200 font-medium focus:ring-indigo-500 focus:border-indigo-500 p-1.5 ${
                            store.status === 'ACTIVE' ? 'text-green-700 bg-green-50' : store.status === 'SUSPENDED' ? 'text-yellow-700 bg-yellow-50' : 'text-gray-700 bg-gray-100'
                          }`}
                        >
                          <option value="ACTIVE">{t.status_active_store} (ACTIVE)</option>
                          <option value="SUSPENDED">{t.status_suspended} (SUSPENDED)</option>
                          <option value="CLOSED">{t.status_closed} (CLOSED)</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
