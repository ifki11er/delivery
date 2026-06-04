'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserStatus } from '@prisma/client';
import { useI18n } from '@/i18n/I18nProvider';
import type { AdminUserRow } from '@/types/admin';

export default function UserListClient({ users: initialUsers, filterType }: { users: AdminUserRow[]; filterType: string }) {
  const t = useI18n();
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    if (newStatus === 'WITHDRAWN') {
      if (!confirm(t.admin_user_withdraw_confirm)) return;
    } else if (!confirm(t.admin_user_status_confirm.replace('{status}', newStatus))) {
      return;
    }

    setLoadingId(userId);
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
      });

      if (res.ok) {
        alert(t.admin_status_changed);
        setUsers(users.map((u) => (u.id === userId ? { ...u, status: newStatus, deletedAt: newStatus === 'WITHDRAWN' ? new Date() : null } : u)));
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
      case 'active': return t.admin_active_users;
      case 'suspended': return t.admin_suspended_users;
      case 'withdrawn': return t.admin_withdrawn_users;
      case 'owner': return t.admin_owner_users;
      case 'customer': return t.admin_customer_users;
      case 'admin': return t.admin_admin_users;
      case 'employee': return t.admin_employee_users;
      default: return t.admin_total_users;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <Link href="/admin" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{getFilterTitle()} {t.list_suffix}</h1>
          <p className="text-gray-500 mt-1">{t.admin_users_count.replace('{count}', String(users.length))}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-semibold">{t.name}</th>
                <th className="py-4 px-6 font-semibold">{t.email_address}</th>
                <th className="py-4 px-6 font-semibold">{t.manage_contact}</th>
                <th className="py-4 px-6 font-semibold">{t.role}</th>
                <th className="py-4 px-6 font-semibold">{t.joined_at}</th>
                <th className="py-4 px-6 font-semibold">{t.admin_current_status_manage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">{t.admin_no_users}</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{user.name || t.mypage_no_name}</td>
                    <td className="py-4 px-6 text-gray-500">{user.email}</td>
                    <td className="py-4 px-6 text-gray-500">{user.phoneNumber || '-'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : user.role === 'ADMIN' ? 'bg-gray-100 text-gray-700' : user.role === 'EMPLOYEE' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {user.status === 'ACTIVE' && <UserCheck className="w-5 h-5 text-green-500" />}
                        {user.status === 'SUSPENDED' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        {user.status === 'WITHDRAWN' && <UserX className="w-5 h-5 text-red-500" />}
                        <select
                          value={user.status}
                          disabled={loadingId === user.id}
                          onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                          className={`text-sm rounded-lg border-gray-200 font-medium focus:ring-indigo-500 focus:border-indigo-500 p-1.5 ${
                            user.status === 'ACTIVE' ? 'text-green-700 bg-green-50' : user.status === 'SUSPENDED' ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'
                          }`}
                        >
                          <option value="ACTIVE">{t.status_active} (ACTIVE)</option>
                          <option value="SUSPENDED">{t.status_suspended} (SUSPENDED)</option>
                          <option value="WITHDRAWN">{t.status_withdrawn} (WITHDRAWN)</option>
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
