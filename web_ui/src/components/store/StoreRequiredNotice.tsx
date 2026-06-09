'use client';

import { Store } from 'lucide-react';

export function StoreRequiredNotice() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Store className="h-7 w-7 text-indigo-500" />
        </div>
        <p className="text-base font-bold text-gray-900">상점이 없습니다.</p>
        <p className="mt-2 text-sm text-gray-500">상점 계정이 필요하면 관리자에게 문의해주세요.</p>
      </div>
    </div>
  );
}
