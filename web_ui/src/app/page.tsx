'use client';

import { MapPin, Search, ShoppingCart, ChevronDown, Star, Clock, Bike } from 'lucide-react';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';

const CATEGORIES = [
  { key: 'home_category_single', icon: '🍲' },
  { key: 'home_category_jokbal', icon: '🍖' },
  { key: 'home_category_soup', icon: '🥘' },
  { key: 'home_category_japanese', icon: '🍣' },
  { key: 'home_category_pizza', icon: '🍕' },
  { key: 'home_category_grill', icon: '🥩' },
  { key: 'home_category_late', icon: '🌙' },
  { key: 'home_category_western', icon: '🍝' },
  { key: 'home_category_chicken', icon: '🍗' },
  { key: 'home_category_chinese', icon: '🍜' },
];

const MOCK_STORES = [
  {
    id: 1,
    nameKey: 'mock_store_burger',
    rating: 4.9,
    reviews: 1250,
    deliveryTimeKey: 'mock_delivery_20_35',
    deliveryFeeKey: 'free_delivery',
    minOrder: '15,000',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
    tagKeys: ['tag_coupon', 'tag_takeout'],
  },
  {
    id: 2,
    nameKey: 'mock_store_pizza',
    rating: 4.8,
    reviews: 843,
    deliveryTimeKey: 'mock_delivery_30_45',
    deliveryFeeKey: 'mock_fee_1500',
    minOrder: '18,000',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    tagKeys: ['tag_new', 'tag_delivery_discount'],
  },
  {
    id: 3,
    nameKey: 'mock_store_chicken',
    rating: 4.7,
    reviews: 3200,
    deliveryTimeKey: 'mock_delivery_25_40',
    deliveryFeeKey: 'free_delivery',
    minOrder: '16,000',
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=800&auto=format&fit=crop',
    tagKeys: ['tag_popular', 'free_delivery'],
  },
];

export default function Home() {
  const t = useI18n();

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 cursor-pointer group">
              <MapPin className="w-5 h-5 text-gray-900 group-hover:text-indigo-600 transition-colors" />
              <span className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                {t.sample_location}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-900" />
            </div>
            <button className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                3
              </span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
              placeholder={t.search_placeholder}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-4">
        <div className="relative w-full h-36 md:h-48 rounded-2xl overflow-hidden shadow-sm group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
            <span className="inline-block px-2 py-1 bg-white/20 rounded-md text-xs font-bold w-fit mb-2 backdrop-blur-sm">{t.limited_event}</span>
            <h2 className="text-xl md:text-2xl font-extrabold leading-tight whitespace-pre-line">{t.hero_title}</h2>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute right-8 top-4 text-5xl opacity-80 transform group-hover:scale-110 transition-transform">%</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-5 gap-y-4 gap-x-2">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex flex-col items-center justify-center space-y-2 cursor-pointer group">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-50 transition-colors">
                  {cat.icon}
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center tracking-tight leading-tight">
                  {t[cat.key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">{t.popular_stores}</h3>
          <div className="space-y-5">
            {MOCK_STORES.map((store, idx) => (
              <div key={store.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group">
                <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                  <Image
                    unoptimized
                    src={store.imageUrl}
                    alt={t[store.nameKey]}
                    fill
                    priority={idx === 0}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                  <div className="absolute top-3 left-3 flex gap-1">
                    {store.tagKeys.map((tagKey) => (
                      <span key={tagKey} className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-sm">
                        {t[tagKey]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-lg text-gray-900 mb-1 truncate">{t[store.nameKey]}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <div className="flex items-center font-bold text-gray-900">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                      {store.rating}
                    </div>
                    <span>({store.reviews.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <div className="flex items-center bg-gray-100 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 mr-1 text-gray-600" />
                      <span className="font-medium text-gray-700">{t[store.deliveryTimeKey]}</span>
                    </div>
                    <div className="flex items-center">
                      <Bike className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      <span className={`font-medium ${store.deliveryFeeKey === 'free_delivery' ? 'text-indigo-600 font-bold' : ''}`}>
                        {t[store.deliveryFeeKey]}
                      </span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span>{t.min_order} {store.minOrder}{t.currency_won}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
