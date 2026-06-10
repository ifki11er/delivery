'use client';

import Link from 'next/link';
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
const appTabStorageKey = 'worklink_app_active_tab';

export default function BottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const t = useI18n();
  const [activeAppTab, setActiveAppTab] = useState<AppTab>('monitor');

  // 로그인하지 않은 경우 바텀 네비게이션을 숨김
  const menuItems = [
    { label: t.nav_print, icon: <Printer className="w-5 h-5" />, href: '/app#monitor', legacyHref: '/store/monitor', appTab: 'monitor' as const },
    { label: t.nav_attendance, icon: <ClipboardCheck className="w-5 h-5" />, href: '/app#employees', legacyHref: '/store/employees', appTab: 'employees' as const },
    { label: t.nav_mini_receipt, icon: <ReceiptText className="w-5 h-5" />, href: '/app#miniReceipt', legacyHref: '/store/mini-receipt', appTab: 'miniReceipt' as const },
    { label: t.nav_my_info, icon: <User className="w-5 h-5" />, href: '/app#mypage', legacyHref: '/mypage', appTab: 'mypage' as const },
  ];
  const isAppShell = pathname === '/app';

  useEffect(() => {
    const storedTab = window.__worklinkActiveAppTab || window.localStorage.getItem(appTabStorageKey);
    if (storedTab) setActiveAppTab(storedTab as AppTab);

    const handleTabChange = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: AppTab }>).detail?.tab;
      if (tab) setActiveAppTab(tab);
    };

    window.addEventListener('worklink-app-tab-changed', handleTabChange);
    return () => window.removeEventListener('worklink-app-tab-changed', handleTabChange);
  }, []);

  if (!session) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const isActive = isAppShell
            ? (item.appTab === 'mypage' ? mypageTabs.includes(activeAppTab) : activeAppTab === item.appTab)
            : pathname === item.legacyHref || pathname.startsWith(`${item.legacyHref}/`);
          const className = `flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'
          }`;
          return isAppShell ? (
            <button
              key={item.href}
              type="button"
              onClick={(event) => {
                event.currentTarget.blur();
                window.dispatchEvent(new CustomEvent('worklink-app-navigate', { detail: { tab: item.appTab } }));
              }}
              className={className}
            >
              <div>{item.icon}</div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={className}
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
