'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePlatform } from '@/hooks/usePlatform';
import { LogOut, User, Store, Settings, Printer, ChevronRight, ClipboardList, Shield, Calculator, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { useI18n } from '@/i18n/I18nProvider';
import { useState, useEffect } from 'react';

export default function MypageClient() {
  const { data: session, status, update } = useSession();
  const { platform, isReady } = usePlatform();
  const t = useI18n();
  const [isEmployee, setIsEmployee] = useState(false);
  const [userRole, setUserRole] = useState(session?.user?.role || 'CUSTOMER');

  useEffect(() => {
    if (session?.user) {
      setUserRole(session.user.role);
      fetch('/api/user/employee-status')
        .then(res => res.json())
        .then(data => {
          setIsEmployee(data.isEmployee);
          if (data.role && data.role !== session.user.role) {
            setUserRole(data.role);
            update({ role: data.role }); // 쿠키 세션 강제 업데이트
          }
        })
        .catch(() => setIsEmployee(false));
    }
  }, [session, update]);

  if (status === 'loading' || !isReady) {
    return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
  }

  if (!session?.user) {
    return <div className="p-8 text-center text-gray-500">로그인이 필요합니다.</div>;
  }

  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN';

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
        
        {/* 일반 고객용 메뉴 */}
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t.general_menu || '일반 메뉴'}
        </div>
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

        {/* 사장님 메뉴 (일반 고객은 입점신청, 사장님/관리자는 관리 메뉴) */}
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t.owner_menu || '사장님 메뉴'}
        </div>
        
        {!isOwner && !isAdmin && (
          <Link href="/business-apply" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3 text-indigo-600">
              <Store className="w-5 h-5" />
              <span className="font-semibold">상점 입점 신청</span>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-400" />
          </Link>
        )}

        {/* 최고 관리자(ADMIN) 전용 메뉴 */}
        {isAdmin && (
          <>
            <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-600 uppercase tracking-wider">
              {t.admin_only || '관리자 메뉴'}
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

        {/* 사장님 전용 메뉴 */}
        {(isOwner || isAdmin) && (
          <>
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
            <Link href="/store/blacklist" className="flex items-center justify-between p-4 hover:bg-red-50 transition-colors">
              <div className="flex items-center space-x-3 text-red-700">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-bold">{t.blacklist || '블랙컨슈머 공유'}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </Link>
            
            <Link href="/store/employees/stats" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <Calculator className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.employee_stats || '급여 및 통계'}</span>
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

        {/* 직원 전용 메뉴 */}
        {isEmployee && (
          <>
            <div className="bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider">
              {t.employee_section || '직원 메뉴'}
            </div>
            <Link href="/employee/dashboard" className="flex items-center justify-between p-4 hover:bg-indigo-50 transition-colors">
              <div className="flex items-center space-x-3 text-indigo-700">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span className="font-bold">{t.employee_dashboard || '내 근무 및 출퇴근'}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400" />
            </Link>
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
