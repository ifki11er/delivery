'use client';

import { useI18n } from '@/i18n/I18nProvider';
import Image from 'next/image';
import { Star, Clock, Bike, Heart } from 'lucide-react';

const MOCK_FAVORITES = [
  {
    id: 1,
    name: '육즙가득 프리미엄 수제버거 역삼점',
    rating: 4.9,
    reviews: 1250,
    deliveryTime: '20~35분',
    deliveryFee: '무료배달',
    minOrder: '15,000원',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
    tags: ['쿠폰할인', '포장가능'],
  },
  {
    id: 3,
    name: '바삭바삭 옛날통닭과 떡볶이',
    rating: 4.7,
    reviews: 3200,
    deliveryTime: '25~40분',
    deliveryFee: '무료배달',
    minOrder: '16,000원',
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=800&auto=format&fit=crop',
    tags: ['인기', '무료배달'],
  },
];

export default function FavoritesPage() {
  const t = useI18n();

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <h1 className="font-bold text-lg text-gray-900">{t.favorites}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        {MOCK_FAVORITES.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
            <Heart className="w-16 h-16 text-gray-200" />
            <p className="text-gray-500 font-medium">{t.no_favorites}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-gray-900">총 {MOCK_FAVORITES.length}개</span>
            </div>
            {MOCK_FAVORITES.map((store) => (
              <div key={store.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group flex flex-col sm:flex-row">
                <div className="relative h-48 sm:h-auto sm:w-1/3 sm:aspect-square w-full overflow-hidden bg-gray-200 shrink-0">
                  <Image
                    src={store.imageUrl}
                    alt={store.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-full shadow-sm backdrop-blur-sm">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </div>
                </div>
                
                <div className="p-4 flex flex-col justify-center flex-grow">
                  <h4 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{store.name}</h4>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <div className="flex items-center font-bold text-gray-900">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                      {store.rating}
                    </div>
                    <span>({store.reviews.toLocaleString()})</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
                    <div className="flex items-center bg-gray-100 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 mr-1 text-gray-600" />
                      <span className="font-medium text-gray-700">{store.deliveryTime}</span>
                    </div>
                    <div className="flex items-center">
                      <Bike className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      <span className={`font-medium ${store.deliveryFee === '무료배달' ? 'text-indigo-600 font-bold' : ''}`}>
                        {store.deliveryFee === '무료배달' ? t.free_delivery : store.deliveryFee}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
