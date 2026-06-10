'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import MonitorPage from '@/app/store/monitor/page';
import StoreEmployeesPage from '@/app/store/employees/page';
import MiniReceiptPage from '@/app/store/mini-receipt/page';
import MypageClient from '@/app/mypage/MypageClient';
import StoreManagePage from '@/app/store/manage/page';
import MenuLanguagePage from '@/app/store/menu-language/page';
import BlacklistPage from '@/app/store/blacklist/page';
import NewBlacklistPage from '@/app/store/blacklist/new/page';
import SettingsPage from '@/app/settings/page';
import { useFeedback } from '@/components/providers/FeedbackProvider';

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

declare global {
  interface Window {
    __worklinkActiveAppTab?: AppTab;
  }
}

const defaultTab: AppTab = 'monitor';
const tabStorageKey = 'worklink_app_active_tab';
const tabSet = new Set<AppTab>([
  'monitor',
  'employees',
  'miniReceipt',
  'mypage',
  'storeManage',
  'menuLanguage',
  'blacklist',
  'blacklistNew',
  'settings',
]);

function normalizeTab(value?: string | null): AppTab {
  if (value === 'mini-receipt') return 'miniReceipt';
  return tabSet.has(value as AppTab) ? value as AppTab : defaultTab;
}

function getInitialTab() {
  if (typeof window === 'undefined') return defaultTab;

  const hash = window.location.hash.replace('#', '');
  if (hash) return normalizeTab(hash);

  return normalizeTab(window.localStorage.getItem(tabStorageKey));
}

export default function AppShellPage() {
  const { confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<AppTab>>(() => new Set([getInitialTab()]));
  const activeTabRef = useRef(activeTab);
  const tabHistoryRef = useRef<AppTab[]>([]);

  const tabs = useMemo(() => ([
    { key: 'monitor' as const, component: <MonitorPage /> },
    { key: 'employees' as const, component: <StoreEmployeesPage /> },
    { key: 'miniReceipt' as const, component: <MiniReceiptPage /> },
    { key: 'mypage' as const, component: <MypageClient /> },
    { key: 'storeManage' as const, component: <StoreManagePage /> },
    { key: 'menuLanguage' as const, component: <MenuLanguagePage /> },
    { key: 'blacklist' as const, component: <BlacklistPage /> },
    { key: 'blacklistNew' as const, component: <NewBlacklistPage /> },
    { key: 'settings' as const, component: <SettingsPage /> },
  ]), []);

  const activateTab = (tab: AppTab, options?: { recordHistory?: boolean }) => {
    const currentTab = activeTabRef.current;
    if (tab === currentTab) return;

    if (options?.recordHistory) {
      tabHistoryRef.current = [...tabHistoryRef.current, currentTab].slice(-20);
    }

    activeTabRef.current = tab;
    window.__worklinkActiveAppTab = tab;
    setActiveTab(tab);
    setMountedTabs((current) => {
      if (current.has(tab)) return current;
      return new Set([...current, tab]);
    });
    window.localStorage.setItem(tabStorageKey, tab);
    window.history.replaceState(null, '', `#${tab}`);
    window.dispatchEvent(new CustomEvent('worklink-app-tab-changed', { detail: { tab } }));
  };

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      activateTab(normalizeTab((event as CustomEvent<{ tab?: string }>).detail?.tab), { recordHistory: true });
    };

    const handleHashChange = () => activateTab(normalizeTab(window.location.hash.replace('#', '')));

    const handleAndroidBack = async () => {
      const previousTab = tabHistoryRef.current.pop();
      if (previousTab) {
        activateTab(previousTab);
        return;
      }

      if (['storeManage', 'menuLanguage', 'blacklist', 'blacklistNew', 'settings'].includes(activeTab)) {
        activateTab('mypage');
        return;
      }

      if (activeTab !== defaultTab) {
        activateTab(defaultTab);
        return;
      }

      if (await confirm({
        title: '앱 종료',
        message: '종료하시겠습니까?',
        confirmText: '종료',
        cancelText: '취소',
        danger: true,
      })) {
        const closedByApp = window.AndroidBridge?.finishApp?.() ?? false;
        if (!closedByApp) {
          window.close();
        }
      }
    };

    window.addEventListener('worklink-app-navigate', handleNavigate);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('worklink-android-back', handleAndroidBack);

    return () => {
      window.removeEventListener('worklink-app-navigate', handleNavigate);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('worklink-android-back', handleAndroidBack);
    };
  }, [activeTab, confirm]);

  useEffect(() => {
    window.__worklinkActiveAppTab = activeTab;
    window.localStorage.setItem(tabStorageKey, activeTab);
    window.dispatchEvent(new CustomEvent('worklink-app-tab-changed', { detail: { tab: activeTab } }));
  }, [activeTab]);

  return (
    <>
      {tabs.map((tab) => (
        mountedTabs.has(tab.key) ? (
          <section
            key={tab.key}
            hidden={activeTab !== tab.key}
            aria-hidden={activeTab !== tab.key}
          >
            {tab.component}
          </section>
        ) : null
      ))}
    </>
  );
}
