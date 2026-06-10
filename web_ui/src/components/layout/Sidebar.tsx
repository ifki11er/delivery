'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ClipboardCheck, Printer, ReceiptText, User } from 'lucide-react';
import type { Session } from 'next-auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useEffect, useState } from 'react';

type AppTab =
  | 'monitor'
  | 'employees'
  | 'miniReceipt'
  | 'mypage'
  | 'storeManage'
  | 'menuLanguage'
  | 'blacklist'
  | 'blacklistNew'
  | 'settings';

const mypageTabs: AppTab[] = ['mypage', 'storeManage', 'menuLanguage', 'blacklist', 'blacklistNew', 'settings'];

export default function Sidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const t = useI18n();
  const [activeAppTab, setActiveAppTab] = useState<AppTab>('monitor');

  // 로그인하지 않은 경우 사이드바를 숨김
  const menuItems = [
    { label: t.nav_print, icon: <Printer className="w-5 h-5" />, href: '/app#monitor', legacyHref: '/store/monitor', appTab: 'monitor' as const },
    { label: t.nav_attendance, icon: <ClipboardCheck className="w-5 h-5" />, href: '/app#employees', legacyHref: '/store/employees', appTab: 'employees' as const },
    { label: t.nav_mini_receipt, icon: <ReceiptText className="w-5 h-5" />, href: '/app#miniReceipt', legacyHref: '/store/mini-receipt', appTab: 'miniReceipt' as const },
    { label: t.nav_my_info, icon: <User className="w-5 h-5" />, href: '/app#mypage', legacyHref: '/mypage', appTab: 'mypage' as const },
  ];
  const isAppShell = pathname === '/app';

  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: AppTab }>).detail?.tab;
      if (tab) setActiveAppTab(tab);
    };

    window.addEventListener('worklink-app-tab-changed', handleTabChange);
    return () => window.removeEventListener('worklink-app-tab-changed', handleTabChange);
  }, []);

  if (!session) return null;

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 z-50">
      <div className="p-6 border-b border-gray-200 flex items-center justify-center">
        <Image
          src="/homepage_logo.png"
          alt={t.app_name}
          width={240}
          height={58}
          priority
          className="h-auto w-full max-w-[180px]"
        />
      </div>
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = isAppShell
            ? (item.appTab === 'mypage' ? mypageTabs.includes(activeAppTab) : activeAppTab === item.appTab)
            : pathname === item.legacyHref || pathname.startsWith(`${item.legacyHref}/`);
          const className = `flex items-center px-4 py-3 rounded-xl transition-colors ${
            isActive
              ? 'bg-indigo-50 text-indigo-600 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
          }`;
          return isAppShell ? (
            <button
              key={item.href}
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('worklink-app-navigate', { detail: { tab: item.appTab } }))}
              className={className}
            >
              <div className="mr-3">{item.icon}</div>
              <span>{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={className}
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
