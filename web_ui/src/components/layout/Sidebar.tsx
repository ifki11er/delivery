'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListOrdered, Heart, User, LogOut } from 'lucide-react';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  session: Session | null;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();

  // 로그인하지 않은 경우 사이드바를 숨김
  if (!session) return null;

  const isOwner = session.user?.role === 'OWNER' || session.user?.role === 'ADMIN';

  const menuItems = isOwner
    ? [
        { name: '홈', href: '/', icon: Home },
        { name: '주문 접수', href: '/orders', icon: ListOrdered },
        { name: '가게 관리', href: '/store', icon: Heart },
        { name: '마이페이지', href: '/mypage', icon: User },
      ]
    : [
        { name: '홈', href: '/', icon: Home },
        { name: '주문 내역', href: '/orders', icon: ListOrdered },
        { name: '찜', href: '/favorites', icon: Heart },
        { name: '마이페이지', href: '/mypage', icon: User },
      ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 z-50">
      <div className="p-6 border-b border-gray-200 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-indigo-600">배달앱</h1>
      </div>
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center w-full px-4 py-3 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-semibold">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
