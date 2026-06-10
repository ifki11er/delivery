'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Store, Wifi, Save, Send, ChevronLeft, Search, User, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import type { StoreSummary, UserSearchResult } from '@/types/store-management';

const DEFAULT_TIME_ZONE =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';

const TIME_ZONE_OPTIONS = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Manila',
  'Asia/Singapore',
  'UTC',
];

const DEFAULT_CURRENCY = '₫';
// 화폐 단위 선택 UI를 다시 사용하려면 true로 바꾸고, fetchStores의 setCurrency에서 저장된 값을 복원하면 된다.
const SHOW_CURRENCY_SELECTOR = false;

function resolveStoreTimeZone(timeZone?: string | null) {
  return timeZone && timeZone !== 'UTC' ? timeZone : DEFAULT_TIME_ZONE;
}

export default function StoreManagePage() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useI18n();
  const { confirm, prompt } = useFeedback();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for the primary store
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [businessRegNo, setBusinessRegNo] = useState('');
  const [wifiIp, setWifiIp] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const applyStoreToForm = (store: StoreSummary) => {
    setStoreId(store.id);
    setStoreName(store.name);
    setAddress(store.address || '');
    setContact(store.contact || '');
    setRepresentativeName(store.representativeName || '');
    setBusinessRegNo(store.businessRegNo || '');
    setWifiIp(store.wifiIpAddress || '');
    setCurrency(DEFAULT_CURRENCY);
    setTimeZone(resolveStoreTimeZone(store.timeZone));
  };

  // Fetch stores on load
  const fetchStores = async (preferredStoreId?: string) => {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = (await res.json()) as StoreSummary[];
        setStores(data);
        if (data.length > 0) {
          const selectedStore = data.find((store) => store.id === preferredStoreId)
            || data.find((store) => store.id === storeId)
            || data[0];
          applyStoreToForm(selectedStore);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);



  const handleUpdateStore = async () => {
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: storeId, 
          name: storeName, 
          address, 
          contact, 
          representativeName, 
          businessRegNo, 
          currency: DEFAULT_CURRENCY,
          timeZone
        })
      });
      if (res.ok) {
        const updatedStore = (await res.json()) as StoreSummary;
        alert(t.manage_save_success);
        await fetchStores(updatedStore.id || storeId);
      } else {
        const err = await res.json();
        alert(t.manage_save_fail_with_error.replace('{error}', err.error || 'Unknown error'));
      }
    } catch {
      alert(t.manage_save_fail);
    }
  };

  const handleCreateStore = async () => {
    const name = await prompt({
      title: '상점 추가',
      message: '새 상점 이름을 입력해주세요.',
      defaultValue: '새 상점',
    });
    if (!name?.trim()) return;

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), timeZone: DEFAULT_TIME_ZONE }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '상점 추가에 실패했습니다.');
        return;
      }
      const createdStore = (await res.json()) as StoreSummary;
      await fetchStores(createdStore.id);
    } catch {
      alert('상점 추가 중 오류가 발생했습니다.');
    }
  };

  const handleRegisterWifi = async () => {
    if (!storeId) return alert(t.manage_wifi_ip_failed);

    try {
      const res = await fetch('/api/store/wifi-ip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update IP');

      setWifiIp(data.wifiIpAddress);
      alert(t.manage_wifi_ip_loaded.replace('{ip}', data.wifiIpAddress));
    } catch {
      alert(t.manage_wifi_ip_failed);
    }
  };

  const handleSearchUser = async () => {
    if (!searchPhone) return alert(t.manage_transfer_phone_required);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/user/search?phone=${searchPhone}`);
      if (res.ok) {
        const user = (await res.json()) as UserSearchResult;
        setSearchResults([user]);
      } else if (res.status === 404) {
        alert(t.manage_transfer_user_not_found);
        setSearchResults([]);
      } else {
        alert(t.manage_transfer_search_failed);
        setSearchResults([]);
      }
    } catch {
      alert(t.manage_transfer_search_error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTransfer = async (userId: string, userName: string) => {
    if (!(await confirm({ message: t.manage_transfer_confirm.replace('{name}', userName) }))) return;

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storeId, newOwnerId: userId })
      });
      if (res.ok) {
        alert(t.manage_transfer_success);
        setSearchPhone('');
        setSearchResults([]);
        fetchStores(); // Reload
      } else {
        const err = await res.json();
        alert(t.manage_transfer_failed.replace('{error}', err.error));
      }
    } catch {
      alert(t.manage_transfer_error);
    }
  };

  const handleBack = () => {
    if (pathname === '/app') {
      window.dispatchEvent(new CustomEvent('worklink-app-navigate', { detail: { tab: 'mypage' } }));
      return;
    }

    router.back();
  };

  const handleDeleteStore = async () => {
    if (!(await confirm({
      title: t.store_management,
      message: t.manage_close_confirm.replace('{name}', storeName),
      danger: true,
    }))) return;
    
    // 이중 확인
    const confirmName = await prompt({
      title: t.store_management,
      message: t.manage_close_prompt.replace('{name}', storeName),
    });
    if (confirmName !== storeName) {
      alert(t.manage_close_name_mismatch);
      return;
    }

    try {
      const res = await fetch(`/api/store?id=${storeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert(t.manage_close_success);
        if (data.remainingStores === 0) {
          router.push('/app#mypage');
        } else {
          fetchStores(); // Reload
        }
      } else {
        const err = await res.json();
        alert(t.manage_close_failed.replace('{error}', err.error));
      }
    } catch {
      alert(t.manage_close_error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">{t.store_management}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">
        {stores.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
            <Store className="w-16 h-16 text-gray-200" />
            <p className="text-gray-500 font-medium">{t.manage_no_store}</p>

          </div>
        ) : (
          <>
            {/* 기본 상점 선택 (간소화를 위해 탭 대신 첫 번째 상점 사용) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {stores.map(store => (
                <button 
                  key={store.id}
                  onClick={() => applyStoreToForm(store)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center ${
                    storeId === store.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {store.name}
                  {store.status === 'CLOSED' && (
                    <span className="ml-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-sm">{t.manage_closed_badge}</span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCreateStore}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-black text-white shadow-sm hover:bg-indigo-700"
                title="상점 추가"
              >
                +
              </button>
            </div>

            {/* 상점 정보 설정 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
              <h2 className="font-bold text-lg text-gray-900 flex items-center">
                <Store className="w-5 h-5 mr-2 text-indigo-500" /> {t.manage_basic_info}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_store_name}</label>
                  <input 
                    type="text" 
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_rep_name}</label>
                    <input 
                      type="text" 
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_contact}</label>
                    <input 
                      type="text" 
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_address}</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_biz_reg}</label>
                  <input 
                    type="text" 
                    value={businessRegNo}
                    onChange={(e) => setBusinessRegNo(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {SHOW_CURRENCY_SELECTOR && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_currency_setting}</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                    >
                      <option value="원">{t.currency_krw}</option>
                      <option value="$">{t.currency_usd}</option>
                      <option value="₫">{t.currency_vnd}</option>
                      <option value="¥">{t.currency_jpy}</option>
                      <option value="€">{t.currency_eur}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">{t.manage_currency_desc}</p>
                  </div>
                )}

                <div className="hidden">
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_timezone_setting}</label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  >
                    {!TIME_ZONE_OPTIONS.includes(timeZone) && <option value={timeZone}>{timeZone}</option>}
                    {TIME_ZONE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">{t.manage_timezone_desc}</p>
                </div>

                <div className="hidden">
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_wifi_auth}</label>
                  <p className="text-xs text-gray-500 mb-2">{t.manage_wifi_desc}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input 
                      type="text" 
                      value={wifiIp}
                      readOnly
                      placeholder={t.manage_wifi_none}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl focus:outline-none"
                    />
                    <button 
                      onClick={handleRegisterWifi}
                      className="w-full sm:w-auto px-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold flex items-center justify-center whitespace-nowrap hover:bg-indigo-100 transition-colors"
                    >
                      <Wifi className="w-4 h-4 mr-2" />
                      {t.manage_wifi_btn}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleUpdateStore}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center hover:bg-indigo-700 transition-colors"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {t.manage_save_btn}
                </button>
              </div>
            </div>

            {/* 상점 양도 */}
            <div className="hidden bg-red-50 rounded-2xl border border-red-100 p-5 space-y-4">
              <h2 className="font-bold text-lg text-red-700 flex items-center">
                <Send className="w-5 h-5 mr-2 text-red-500" /> {t.manage_transfer_title}
              </h2>
              <p className="text-sm text-red-600/80">
                {t.manage_transfer_desc}
              </p>
              
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder={t.manage_transfer_phone_placeholder}
                  className="flex-1 px-4 py-3 bg-white border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <button 
                  onClick={handleSearchUser}
                  disabled={isSearching}
                  className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center min-w-[80px]"
                >
                  {isSearching ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-1" />
                      {t.search_btn}
                    </>
                  )}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-red-100">
                    {searchResults.map((user) => (
                      <div key={user.id} className="p-4 flex items-center justify-between hover:bg-red-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.name || t.mypage_no_name}</p>
                            <p className="text-sm text-gray-500">{user.phoneNumber || user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTransfer(user.id, user.name || t.mypage_no_name)}
                          className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors text-sm whitespace-nowrap"
                        >
                          {t.manage_transfer_btn}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 상점 폐업 (Soft Delete) */}
            <div className="hidden bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Trash2 className="w-32 h-32 text-white" />
              </div>
              <h2 className="font-bold text-lg text-gray-100 flex items-center relative z-10">
                <Store className="w-5 h-5 mr-2" /> {t.manage_close_title}
              </h2>
              <p className="text-sm text-gray-400 relative z-10 leading-relaxed">
                {t.manage_close_desc_prefix} <strong>{t.manage_closed_badge}</strong> {t.manage_close_desc_suffix}<br />
                {t.manage_close_desc_detail}
              </p>
              
              <button 
                onClick={handleDeleteStore}
                className="w-full py-3.5 bg-gray-800 text-red-400 border border-red-900/30 rounded-xl font-bold hover:bg-red-950 transition-colors flex items-center justify-center relative z-10"
              >
                {t.manage_close_btn}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
