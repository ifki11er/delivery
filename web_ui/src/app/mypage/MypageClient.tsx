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
  const [storeName, setStoreName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState(session?.user?.role || 'CUSTOMER');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setUserRole(session.user.role);
      fetch('/api/user/employee-status')
        .then(res => res.json())
        .then(data => {
          setIsEmployee(data.isEmployee);
          setStoreName(data.storeName);
          if (data.role && data.role !== session.user.role) {
            setUserRole(data.role);
            update({ role: data.role }); // 쿠키 세션 강제 업데이트
          }
        })
        .catch(() => setIsEmployee(false));
    }
  }, [session, update]);

  // 세션 정보가 준비되면 초기값 설정
  useEffect(() => {
    if (session?.user && !isEditingProfile) {
      setEditName(session.user.name || '');
      setEditPhone((session.user as any).phoneNumber || '');
    }
  }, [session, isEditingProfile]);

  if (status === 'loading' || !isReady) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;
  }

  if (!session?.user) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_login_req}</div>;
  }

  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN';

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phoneNumber: editPhone })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t.mypage_save_fail);
      }
      const data = await res.json();
      await update({ name: editName, phoneNumber: data.user.phoneNumber });
      setIsEditingProfile(false);
      alert(t.mypage_profile_saved);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      {/* 프로필 섹션 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
        {!isEditingProfile && (
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="absolute top-6 right-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            {t.mypage_edit}
          </button>
        )}
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          
          {isEditingProfile ? (
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500">{t.mypage_name}</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">{t.mypage_phone}</label>
                <input 
                  type="tel" 
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50"
                >
                  {t.mypage_cancel}
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? t.mypage_saving : t.mypage_save}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                {session.user.name || t.mypage_no_name}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{session.user.email}</p>
              <p className="text-sm text-gray-500">{(session.user as any).phoneNumber || t.mypage_no_phone}</p>
              {isEmployee && storeName && (
                <p className="text-sm font-semibold text-indigo-600 mt-1">🏠 {storeName}</p>
              )}
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {isOwner ? t.owner : isAdmin ? t.admin : isEmployee ? t.mypage_employee : t.customer}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        
        {/* 일반 고객용 메뉴 */}
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t.mypage_general_menu}
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
          {t.mypage_owner_menu}
        </div>
        
        <Link href="/business-apply" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3 text-indigo-600">
            <Store className="w-5 h-5" />
            <span className="font-semibold">{t.mypage_apply_store}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-400" />
        </Link>

        {/* 최고 관리자(ADMIN) 전용 메뉴 */}
        {isAdmin && (
          <>
            <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-600 uppercase tracking-wider">
              {t.mypage_admin_menu}
            </div>
            <Link href="/admin" className="flex items-center justify-between p-4 hover:bg-red-50 transition-colors">
              <div className="flex items-center space-x-3 text-red-700">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="font-bold">{t.mypage_admin_dash}</span>
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
                <span className="font-bold">{t.mypage_blacklist}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
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
              {t.mypage_emp_menu}
            </div>
            <Link href="/employee/dashboard" className="flex items-center justify-between p-4 hover:bg-indigo-50 transition-colors">
              <div className="flex items-center space-x-3 text-indigo-700">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span className="font-bold">{t.mypage_emp_dash}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400" />
            </Link>
          </>
        )}

        {/* 계정 관리 */}
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t.mypage_account}
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
