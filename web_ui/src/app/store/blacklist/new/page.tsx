'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, FileText, Phone } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useStores } from '@/components/providers/StoreProvider';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import PageHeader from '@/components/layout/PageHeader';

const MAX_REASON_LENGTH = 100;

export default function NewBlacklistPage() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useI18n();
  const { loading: storesLoading, hasStore } = useStores();
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phone || !reason) {
      alert(t.blacklist_req);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, reason }),
      });

      if (res.ok) {
        alert(t.blacklist_success);
        if (pathname === '/app') {
          window.dispatchEvent(new CustomEvent('worklink-app-navigate', { detail: { tab: 'blacklist' } }));
        } else {
          router.replace('/app#blacklist');
        }
        return;
      }

      const errData = await res.json();
      alert(errData.error || t.blacklist_fail);
    } catch {
      alert(t.blacklist_error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!storesLoading && !hasStore) {
    return <StoreRequiredNotice />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={t.blacklist_add_title}
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
      />

      <div className="max-w-2xl mx-auto px-4 mt-6">
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t.blacklist_phone}</label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="01012345678"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t.blacklist_reason}</label>
              <div className="relative pb-5">
                <FileText className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={reason}
                  maxLength={MAX_REASON_LENGTH}
                  onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON_LENGTH))}
                  placeholder={t.blacklist_reason_placeholder}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <span className="absolute bottom-0 right-1 text-[11px] font-semibold text-gray-400">
                  {reason.length}/{MAX_REASON_LENGTH}자 이내
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? t.mypage_loading : t.blacklist_submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
