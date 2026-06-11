'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Store, Settings, ChevronRight, Printer, Shield, Clock, AlertTriangle, Mail, Phone, ReceiptText, Languages } from 'lucide-react';
import Link from 'next/link';

import { useI18n } from '@/i18n/I18nProvider';
import { useState, useEffect, useRef } from 'react';
import { useFeedback } from '@/components/providers/FeedbackProvider';

type MypageClientProps = {
  appVersion?: string;
};

export default function MypageClient({ appVersion = '0.0.0' }: MypageClientProps) {
  const { data: session, status, update } = useSession();
  const t = useI18n();
  const { confirm } = useFeedback();
  const [isEmployee, setIsEmployee] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState(session?.user?.role || 'CUSTOMER');
  
  // 모드 스위치 상태를 localStorage에서 초기화한다.
  const [viewMode, setViewMode] = useState<'OWNER' | 'EMPLOYEE'>('OWNER');

  useEffect(() => {
    const savedMode = localStorage.getItem('mypage_view_mode');
    if (savedMode === 'EMPLOYEE') {
      setViewMode('EMPLOYEE');
    }
  }, []);

  const handleModeSwitch = (mode: 'OWNER' | 'EMPLOYEE') => {
    setViewMode(mode);
    localStorage.setItem('mypage_view_mode', mode);
  };

  const navigateAppTab = (
    tab: 'monitor' | 'employees' | 'miniReceipt' | 'storeManage' | 'menuLanguage' | 'blacklist' | 'settings',
  ) => {
    window.dispatchEvent(new CustomEvent('worklink-app-navigate', { detail: { tab } }));
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleWithdraw = async () => {
    if (await confirm({
      title: t.mypage_withdraw,
      message: t.mypage_withdraw_desc,
      danger: true,
    })) {
      try {
        const res = await fetch('/api/user/withdraw', { method: 'POST' });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
        } else {
          alert(t.mypage_withdraw_success);
          signOut({ callbackUrl: '/login' });
        }
      } catch {
        alert(t.mypage_withdraw_error);
      }
    }
  };

  const userId = session?.user?.id;
  const hasFetchedRole = useRef(false);

  useEffect(() => {
    if (userId && !hasFetchedRole.current) {
      hasFetchedRole.current = true;
      setUserRole(session.user.role);
      fetch('/api/user/employee-status')
        .then(res => res.json())
        .then(data => {
          setIsEmployee(data.isEmployee);
          setStoreName(data.storeName);
          if (data.role && data.role !== session.user.role) {
            setUserRole(data.role);
            update({ user: { role: data.role } });
          }
        })
        .catch(() => setIsEmployee(false));
    }
  }, [session?.user?.role, userId, update]);

  // 세션 정보가 준비되면 프로필 편집 폼을 초기화한다.
  useEffect(() => {
    if (session?.user && !isEditingProfile) {
      setEditName(session.user.name || '');
      setEditPhone(session.user.phoneNumber || '');
    }
  }, [session, isEditingProfile]);

  if (status === 'loading') {
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
      await update({
        user: {
          name: data.user.name,
          phoneNumber: data.user.phoneNumber,
        },
      });
      setIsEditingProfile(false);
      alert(t.mypage_profile_saved);
    } catch (error) {
      alert(error instanceof Error ? error.message : t.mypage_save_fail);
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
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>{session.user.email}</span>
              </p>
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{session.user.phoneNumber || t.mypage_no_phone}</span>
              </p>
              {isEmployee && storeName && (
                <p className="text-sm font-semibold text-indigo-600 mt-1">{t.mypage_work_store}: {storeName}</p>
              )}
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {isAdmin ? t.admin : isOwner ? t.owner : isEmployee ? t.mypage_employee : t.customer}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 사장님이면서 직원인 경우 모드 전환 탭을 표시한다. */}
      {isOwner && isEmployee && !isAdmin && (
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex text-sm font-bold animate-in fade-in slide-in-from-top-4">
          <button 
            onClick={() => handleModeSwitch('OWNER')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'OWNER' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Store className="w-4 h-4 mr-2" />
            {t.mypage_owner_mode}
          </button>
          <button 
            onClick={() => handleModeSwitch('EMPLOYEE')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'EMPLOYEE' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <User className="w-4 h-4 mr-2" />
            {t.mypage_employee_mode}
          </button>
        </div>
      )}

      {/* 메뉴 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        
        {/* 최고 관리자 메뉴 */}
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
        {isOwner && !isAdmin && (viewMode === 'OWNER' || !isEmployee) && (
          <>
            <button type="button" onClick={() => navigateAppTab('monitor')} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <Printer className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.order_monitor}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button type="button" onClick={() => navigateAppTab('storeManage')} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <Store className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.store_management}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button type="button" onClick={() => navigateAppTab('menuLanguage')} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <Languages className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.menu_language_title || '메뉴언어관리'}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button type="button" onClick={() => navigateAppTab('employees')} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <User className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.employee_management}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button type="button" onClick={() => navigateAppTab('blacklist')} className="flex w-full items-center justify-between p-4 text-left hover:bg-red-50 transition-colors">
              <div className="flex items-center space-x-3 text-red-700">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-bold">{t.mypage_blacklist}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </button>
            <button type="button" onClick={() => navigateAppTab('miniReceipt')} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3 text-gray-700">
                <ReceiptText className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{t.nav_mini_receipt}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </>
        )}

        {/* 직원 전용 메뉴 */}
        {isEmployee && !isAdmin && (viewMode === 'EMPLOYEE' || !isOwner) && (
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
        <button type="button" onClick={() => navigateAppTab('settings')} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3 text-gray-700">
            <Settings className="w-5 h-5" />
            <span className="font-medium">{t.settings}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3 text-red-600">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t.logout}</span>
          </div>
        </button>
        <button
          onClick={handleWithdraw}
          className="w-full flex items-center justify-center p-4 hover:bg-gray-100 transition-colors text-center border-t border-gray-100 mt-4"
        >
          <span className="text-xs text-gray-400 underline">{t.mypage_withdraw}</span>
        </button>
        <p className="pb-5 text-center text-[11px] font-semibold text-gray-300">
          버전 : {appVersion}
        </p>
      </div>
    </div>
  );
}

