'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardCheck, Printer, ReceiptText, ShieldAlert, User } from 'lucide-react';
import type { Session } from 'next-auth';
import { useI18n } from '@/i18n/I18nProvider';

export default function BottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const t = useI18n();

  // 로그인하지 않은 경우 바텀 네비게이션을 숨김
  if (!session) return null;

  const menuItems = [
    { label: t.nav_print, icon: <Printer className="w-5 h-5" />, href: '/store/monitor' },
    { label: t.nav_attendance, icon: <ClipboardCheck className="w-5 h-5" />, href: '/store/employees' },
    { label: t.nav_blacklist, icon: <ShieldAlert className="w-5 h-5" />, href: '/store/blacklist' },
    { label: t.nav_mini_receipt, icon: <ReceiptText className="w-5 h-5" />, href: '/store/mini-receipt' },
    { label: t.nav_my_info, icon: <User className="w-5 h-5" />, href: '/mypage' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'
              }`}
            >
              <div>{item.icon}</div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
