'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ReceiptText } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';

export default function MiniReceiptPage() {
  const router = useRouter();
  const t = useI18n();
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const res = await fetch('/api/store');
        if (!res.ok) {
          setHasStore(false);
          return;
        }

        const stores = (await res.json()) as unknown[];
        setHasStore(stores.length > 0);
      } catch (error) {
        console.error(error);
        setHasStore(false);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;

  if (!hasStore) {
    return <StoreRequiredNotice />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">{t.nav_mini_receipt}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <ReceiptText className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">{t.mini_receipt_coming_soon}</p>
        </div>
      </div>
    </div>
  );
}
