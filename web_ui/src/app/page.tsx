'use client';

import { MapPin, Search, ShoppingCart, ChevronDown, Star, Clock, Bike } from 'lucide-react';
import Image from 'next/image';

const CATEGORIES = [
  { name: '1인분', icon: '🍲' },
  { name: '족발·보쌈', icon: '🍖' },
  { name: '찜·탕·찌개', icon: '🥘' },
  { name: '돈까스·회·일식', icon: '🍣' },
  { name: '피자', icon: '🍕' },
  { name: '고기·구이', icon: '🥩' },
  { name: '야식', icon: '🌙' },
  { name: '양식', icon: '🍝' },
  { name: '치킨', icon: '🍗' },
  { name: '중식', icon: '🍜' },
];

const MOCK_STORES = [
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
    id: 2,
    name: '장인 화덕피자 & 파스타',
    rating: 4.8,
    reviews: 843,
    deliveryTime: '30~45분',
    deliveryFee: '1,500원',
    minOrder: '18,000원',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    tags: ['신규', '배달할인'],
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

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      
      {/* 1. 상단 헤더 (위치 및 검색) */}
      <div className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          {/* 위치 선택기 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 cursor-pointer group">
              <MapPin className="w-5 h-5 text-gray-900 group-hover:text-indigo-600 transition-colors" />
              <span className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                역삼동 123-45
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

          {/* 검색바 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
              placeholder="먹고 싶은 메뉴나 가게를 검색해보세요"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-4">
        
        {/* 2. 프로모션 배너 (Hero Carousel Placeholder) */}
        <div className="relative w-full h-36 md:h-48 rounded-2xl overflow-hidden shadow-sm group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
            <span className="inline-block px-2 py-1 bg-white/20 rounded-md text-xs font-bold w-fit mb-2 backdrop-blur-sm">기간 한정 이벤트</span>
            <h2 className="text-xl md:text-2xl font-extrabold leading-tight">첫 주문이라면<br/>무조건 5,000원 할인!</h2>
          </div>
          {/* 장식용 그래픽 요소 */}
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute right-8 top-4 text-5xl opacity-80 transform group-hover:scale-110 transition-transform">🎉</div>
        </div>

        {/* 3. 카테고리 그리드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-5 gap-y-4 gap-x-2">
            {CATEGORIES.map((cat, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center space-y-2 cursor-pointer group">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-50 transition-colors">
                  {cat.icon}
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center tracking-tight leading-tight">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 추천 맛집 리스트 (Store Feed) */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">우리 동네 인기 맛집 🚀</h3>
          <div className="space-y-5">
            {MOCK_STORES.map((store, idx) => (
              <div key={store.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group">
                {/* 이미지 영역 */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                  <Image
                    src={store.imageUrl}
                    alt={store.name}
                    fill
                    priority={idx === 0}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                  {/* 태그 */}
                  <div className="absolute top-3 left-3 flex gap-1">
                    {store.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* 정보 영역 */}
                <div className="p-4">
                  <h4 className="font-bold text-lg text-gray-900 mb-1 truncate">{store.name}</h4>
                  
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
                      <span className="font-medium text-gray-700">{store.deliveryTime}</span>
                    </div>
                    <div className="flex items-center">
                      <Bike className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                      <span className={`font-medium ${store.deliveryFee === '무료배달' ? 'text-indigo-600 font-bold' : ''}`}>
                        {store.deliveryFee}
                      </span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span>최소주문 {store.minOrder}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 여백 */}
        <div className="h-6"></div>
      </div>
    </div>
  );
}
