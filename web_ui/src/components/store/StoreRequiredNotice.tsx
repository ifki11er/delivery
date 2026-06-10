'use client';

import { LogOut, Store } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useI18n } from '@/i18n/I18nProvider';

export function StoreRequiredNotice() {
  const t = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Store className="h-7 w-7 text-indigo-500" />
        </div>
        <p className="text-base font-bold text-gray-900">상점이 없습니다.</p>
        <p className="mt-2 text-sm text-gray-500">상점 계정이 필요하면 관리자에게 문의해주세요.</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition-colors hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
          {t.logout}
        </button>
      </div>
    </div>
  );
}
