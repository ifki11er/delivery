'use client';

import Link from 'next/link';
import { Store } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export function StoreRequiredNotice() {
  const t = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Store className="h-7 w-7 text-indigo-500" />
        </div>
        <p className="text-base font-bold text-gray-900">{t.store_required_message}</p>
        <Link
          href="/business-apply"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {t.mypage_apply_store}
        </Link>
      </div>
    </div>
  );
}
