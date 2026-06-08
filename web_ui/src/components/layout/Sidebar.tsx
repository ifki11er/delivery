'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardCheck, Printer, ReceiptText, User } from 'lucide-react';
import type { Session } from 'next-auth';
import { useI18n } from '@/i18n/I18nProvider';

export default function Sidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const t = useI18n();

  // 로그인하지 않은 경우 사이드바를 숨김
  if (!session) return null;

  const menuItems = [
    { label: t.nav_print, icon: <Printer className="w-5 h-5" />, href: '/store/monitor' },
    { label: t.nav_attendance, icon: <ClipboardCheck className="w-5 h-5" />, href: '/store/employees' },
    { label: t.nav_mini_receipt, icon: <ReceiptText className="w-5 h-5" />, href: '/store/mini-receipt' },
    { label: t.nav_my_info, icon: <User className="w-5 h-5" />, href: '/mypage' },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 z-50">
      <div className="p-6 border-b border-gray-200 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-indigo-600">{t.app_name}</h1>
      </div>
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <div className="mr-3">{item.icon}</div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
