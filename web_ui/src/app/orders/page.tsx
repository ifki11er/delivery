'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ClipboardList, ChevronRight, ChevronLeft } from 'lucide-react';

const MOCK_ORDERS = [
  {
    id: 'ORD-2023-1101',
    date: '2023-11-01 19:30',
    storeNameKey: 'mock_store_burger',
    menuSummaryKey: 'mock_order_burger_menu',
    price: '21,500',
    status: 'completed',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'ORD-2023-1025',
    date: '2023-10-25 18:15',
    storeNameKey: 'mock_store_pizza',
    menuSummaryKey: 'mock_order_pizza_menu',
    price: '24,000',
    status: 'completed',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
  },
];

export default function OrdersPage() {
  const router = useRouter();
  const t = useI18n();

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-2">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">{t.orders}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        {MOCK_ORDERS.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
            <ClipboardList className="w-16 h-16 text-gray-200" />
            <p className="text-gray-500 font-medium">{t.no_orders}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {MOCK_ORDERS.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">{t.order_date} {order.date}</span>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="font-bold text-gray-900 text-lg">{t[order.storeNameKey]}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md">
                    {order.status === 'completed' ? t.delivery_completed : order.status}
                  </span>
                </div>

                <div className="p-4 flex items-center space-x-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <Image src={order.imageUrl} alt={t[order.storeNameKey]} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-gray-700 font-medium line-clamp-1">{t[order.menuSummaryKey]}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{order.price}{t.currency_won}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50/50 border-t border-gray-50 flex space-x-2">
                  <button className="flex-1 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                    {t.view_details}
                  </button>
                  <button className="flex-1 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
                    {t.reorder}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
