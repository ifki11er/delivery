'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListOrdered, Heart, User } from 'lucide-react';
import { Session } from 'next-auth';

interface BottomNavProps {
  session: Session | null;
}

export default function BottomNav({ session }: BottomNavProps) {
  const pathname = usePathname();

  // 로그인하지 않은 경우 바텀 네비게이션을 숨김
  if (!session) return null;

  const isOwner = session.user?.role === 'OWNER' || session.user?.role === 'ADMIN';

  const menuItems = isOwner
    ? [
        { name: '홈', href: '/', icon: Home },
        { name: '주문 접수', href: '/orders', icon: ListOrdered },
        { name: '가게 관리', href: '/store', icon: Heart }, // 아이콘은 임시
        { name: '마이페이지', href: '/mypage', icon: User },
      ]
    : [
        { name: '홈', href: '/', icon: Home },
        { name: '주문 내역', href: '/orders', icon: ListOrdered },
        { name: '찜', href: '/favorites', icon: Heart },
        { name: '마이페이지', href: '/mypage', icon: User },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
