'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Edit, FileText, Save, Store, Trash2, Users, XCircle } from 'lucide-react';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { useI18n } from '@/i18n/I18nProvider';
import type { AdminBlacklist, AdminStats } from '@/types/admin';

type AdminClientProps = {
  stats: AdminStats;
  allBlacklists?: AdminBlacklist[];
};

type MainTab = 'STATISTICS' | 'BLACKLIST';

export default function AdminClient({ stats, allBlacklists: initialBlacklists = [] }: AdminClientProps) {
  const t = useI18n();
  const { confirm } = useFeedback();
  const [mainTab, setMainTab] = useState<MainTab>('STATISTICS');
  const [blacklists, setBlacklists] = useState<AdminBlacklist[]>(initialBlacklists);
  const [editingBL, setEditingBL] = useState<{ id: string; reason: string } | null>(null);

  const handleDeleteBlacklist = async (id: string) => {
    if (!(await confirm({ message: t.admin_blacklist_delete_confirm, danger: true }))) return;

    try {
      const res = await fetch(`/api/admin/blacklist?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBlacklists((prev) => prev.filter((b) => b.id !== id));
        alert(t.admin_blacklist_delete_success);
      } else {
        alert(t.delete_failed);
      }
    } catch {
      alert(t.common_error);
    }
  };

  const handleUpdateBlacklist = async (id: string, newReason: string) => {
    if (!newReason.trim()) {
      alert(t.blacklist_reason_required);
      return;
    }

    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reason: newReason }),
      });
      if (res.ok) {
        setBlacklists((prev) => prev.map((b) => (b.id === id ? { ...b, reason: newReason } : b)));
        setEditingBL(null);
        alert(t.admin_blacklist_update_success);
      } else {
        alert(t.update_failed);
      }
    } catch {
      alert(t.common_error);
    }
  };

  const userCards = [
    { href: '/admin/users?filter=all', label: t.admin_total_users, value: stats?.users?.total || 0, unit: t.count_people, icon: Users, tone: 'bg-blue-100 text-blue-600' },
    { href: '/admin/users?filter=active', label: t.admin_active_users, value: stats?.users?.active || 0, unit: t.count_people, icon: CheckCircle, tone: 'bg-green-100 text-green-600' },
    { href: '/admin/users?filter=suspended', label: t.admin_suspended_users, value: stats?.users?.suspended || 0, unit: t.count_people, icon: AlertTriangle, tone: 'bg-yellow-100 text-yellow-600' },
    { href: '/admin/users?filter=withdrawn', label: t.admin_withdrawn_users, value: stats?.users?.withdrawn || 0, unit: t.count_people, icon: XCircle, tone: 'bg-red-100 text-red-600' },
  ];

  const roleCards = [
    { href: '/admin/users?filter=owner', label: t.admin_owner_users, value: stats?.users?.owners || 0, icon: Store, tone: 'bg-purple-100 text-purple-600' },
    { href: '/admin/users?filter=customer', label: t.admin_customer_users, value: stats?.users?.customers || 0, icon: Users, tone: 'bg-orange-100 text-orange-600' },
    { href: '/admin/users?filter=employee', label: t.admin_employee_users, value: stats?.users?.employees || 0, icon: FileText, tone: 'bg-teal-100 text-teal-600' },
    { href: '/admin/users?filter=admin', label: t.admin_admin_users, value: stats?.users?.admins || 0, icon: CheckCircle, tone: 'bg-gray-100 text-gray-600' },
  ];

  const storeCards = [
    { href: '/admin/stores?filter=active', label: t.admin_active_stores, value: stats?.stores?.active || 0, icon: Store, tone: 'bg-green-100 text-green-600' },
    { href: '/admin/stores?filter=suspended', label: t.admin_suspended_stores, value: stats?.stores?.suspended || 0, icon: AlertTriangle, tone: 'bg-yellow-100 text-yellow-600' },
    { href: '/admin/stores?filter=closed', label: t.admin_closed_stores, value: stats?.stores?.closed || 0, icon: XCircle, tone: 'bg-gray-100 text-gray-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">{t.admin_dashboard_title}</h1>
        <p className="text-gray-500 mt-2">플랫폼 전체의 사용자, 상점 통계와 블랙리스트를 관리합니다.</p>
      </div>

      <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'STATISTICS' as MainTab, label: t.admin_tab_statistics, icon: Users, active: 'border-blue-600 text-blue-900' },
          { id: 'BLACKLIST' as MainTab, label: t.admin_tab_blacklist, icon: AlertTriangle, active: 'border-red-600 text-red-900' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`text-lg font-bold pb-3 border-b-4 transition-colors flex items-center space-x-1 whitespace-nowrap ${
              mainTab === tab.id ? tab.active : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {mainTab === 'STATISTICS' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {userCards.map((card) => (
              <StatCard key={card.href} {...card} unit={card.unit} />
            ))}
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t.admin_role_breakdown}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {roleCards.map((card) => (
                <StatCard key={card.href} {...card} unit={t.count_people} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">상점 통계</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeCards.map((card) => (
                <StatCard key={card.href} {...card} unit={t.count_items} />
              ))}
            </div>
          </section>
        </div>
      )}

      {mainTab === 'BLACKLIST' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            {t.admin_all_blacklist}
          </h2>

          {blacklists.length === 0 ? (
            <div className="py-12 text-center text-gray-500">{t.admin_blacklist_empty}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-100">
                  <tr>
                    <th className="px-6 py-4">{t.phone_number}</th>
                    <th className="px-6 py-4">{t.blacklist_reason}</th>
                    <th className="px-6 py-4">{t.admin_reporter}</th>
                    <th className="px-6 py-4 text-right">{t.admin_registered_at}</th>
                    <th className="px-6 py-4 text-center">{t.manage}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blacklists.map((bl) => (
                    <tr key={bl.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{bl.phoneNumber}</td>
                      <td className="px-6 py-4">
                        {editingBL?.id === bl.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingBL?.reason ?? ''}
                              onChange={(e) => setEditingBL((current) => (current ? { ...current, reason: e.target.value } : current))}
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button onClick={() => editingBL && handleUpdateBlacklist(bl.id, editingBL.reason)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700" title={t.save}>
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingBL(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300" title={t.cancel}>
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-700">{bl.reason}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{bl.reporter?.name || t.mypage_no_name}</p>
                        <p className="text-xs text-gray-500">{bl.reporter?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">{new Date(bl.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button onClick={() => setEditingBL({ id: bl.id, reason: bl.reason })} disabled={editingBL?.id === bl.id} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50" title={t.edit_reason}>
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBlacklist(bl.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t.delete_permanently}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ href, label, value, unit, icon: Icon, tone }: { href: string; label: string; value: number; unit: string; icon: React.ElementType; tone: string }) {
  return (
    <Link href={href} className="block transform transition-transform hover:scale-105 cursor-pointer">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 h-full">
        <div className={`p-3 rounded-xl ${tone}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}{unit}</p>
        </div>
      </div>
    </Link>
  );
}
