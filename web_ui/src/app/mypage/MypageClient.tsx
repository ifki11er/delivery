'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePlatform } from '@/hooks/usePlatform';
import { LogOut, User, Store, Settings, Printer, ChevronRight, ClipboardList, Shield } from 'lucide-react';
import Link from 'next/link';

import { useI18n } from '@/i18n/I18nProvider';

export default function MypageClient() {
  const { data: session, status } = useSession();
  const { platform, isReady } = usePlatform();
  const t = useI18n();

  if (status === 'loading' || !isReady) {
    return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
  }

  if (!session?.user) {
    return <div className="p-8 text-center text-gray-500">로그인이 필요합니다.</div>;
  }

  const isOwner = session.user.role === 'OWNER';
  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      {/* 프로필 섹션 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t.greeting.replace('{name}', session.user.name || session.user.email?.split('@')[0] || '')}
          </h2>
          <p className="text-sm text-gray-500">{session.user.email}</p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {isOwner ? t.owner : isAdmin ? t.admin : t.customer}
          </div>
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        
        {/* 일반 고객용 메뉴 (사장님도 표시) */}
        <Link href="/orders" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3 text-gray-700">
            <span className="font-medium">{t.orders}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
        <Link href="/favorites" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3 text-gray-700">
            <span className="font-medium">{t.favorites}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* 입점 신청 메뉴 (일반 고객만 표시) */}
        {!isOwner && !isAdmin && (
          <Link href="/business-apply" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3 text-indigo-600">
              <Store className="w-5 h-5" />
              <span className="font-semibold">{t.business_apply}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-400" />
          </Link>
        )}

        {/* 최고 관리자(ADMIN) 전용 메뉴 */}
        {isAdmin && (
          <>
            <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-600 uppercase tracking-wider">
              {t.admin_only}
            </div>
            <Link href="/admin" className="flex items-center justify-between p-4 hover:bg-red-50 transition-colors">
              <div className="flex items-center space-x-3 text-red-700">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="font-bold">{t.admin_dashboard}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </Link>
          </>
        )}

        {/* 사장님 전용 메뉴 (최고관리자도 접근 가능) */}
        {(isOwner || isAdmin) && (
          <>
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t.owner_menu}
            </div>
            <Link href="/store/monitor" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <ClipboardList className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.order_monitor}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link href="/store/manage" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <Store className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.store_management}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link href="/store/employees" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <User className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.employee_management}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            
            {/* 앱(웹뷰) 환경에서만 보이는 프린터 설정 메뉴 */}
            {platform === 'app' && (
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
                    (window as any).AndroidBridge.openBluetoothSettings();
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3 text-gray-700">
                  <Printer className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{t.printer_settings}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </>
        )}

        {/* 계정 관리 */}
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t.account_section}
        </div>
        <Link href="/settings" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3 text-gray-700">
            <Settings className="w-5 h-5" />
            <span className="font-medium">{t.settings}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3 text-red-600">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t.logout}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
