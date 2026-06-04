'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Wifi, Save, Send, ChevronLeft, Search, User, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { StoreSummary, UserSearchResult } from '@/types/store-management';

export default function StoreManagePage() {
  const router = useRouter();
  const t = useI18n();
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
  const [currency, setCurrency] = useState('원');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch stores on load
  const fetchStores = async () => {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = (await res.json()) as StoreSummary[];
        setStores(data);
        if (data.length > 0) {
          const primary = data[0];
          setStoreId(primary.id);
          setStoreName(primary.name);
          setAddress(primary.address || '');
          setContact(primary.contact || '');
          setRepresentativeName(primary.representativeName || '');
          setBusinessRegNo(primary.businessRegNo || '');
          setWifiIp(primary.wifiIpAddress || '');
          setCurrency(primary.currency || '원');
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
          wifiIpAddress: wifiIp,
          currency
        })
      });
      if (res.ok) {
        alert(t.manage_save_success || '상점 정보가 저장되었습니다.');
        fetchStores();
      } else {
        const err = await res.json();
        alert((t.manage_save_fail || '저장 실패: ') + (err.error || 'Unknown error'));
      }
    } catch {
      alert(t.manage_save_fail || '저장 실패');
    }
  };

  const handleRegisterWifi = async () => {
    try {
      // In a real app, you might use a 3rd party service like ipify to get the true public IP
      // from the client's perspective, or rely on the server.
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setWifiIp(data.ip);
      alert(`현재 연결된 Wi-Fi IP(${data.ip})를 가져왔습니다. 저장 버튼을 눌러주세요.`);
    } catch {
      alert('IP 주소를 가져오는데 실패했습니다.');
    }
  };

  const handleSearchUser = async () => {
    if (!searchPhone) return alert('양도받을 사장님의 전화번호를 입력하세요.');
    setIsSearching(true);
    try {
      const res = await fetch(`/api/user/search?phone=${searchPhone}`);
      if (res.ok) {
        const user = (await res.json()) as UserSearchResult;
        setSearchResults([user]);
      } else if (res.status === 404) {
        alert('해당 전화번호로 가입된 회원이 없습니다.');
        setSearchResults([]);
      } else {
        alert('검색에 실패했습니다.');
        setSearchResults([]);
      }
    } catch {
      alert('검색 중 오류가 발생했습니다.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTransfer = async (userId: string, userName: string) => {
    if (!confirm(`정말로 상점을 [${userName}]님에게 양도하시겠습니까?\n모든 직원과 통계 데이터가 함께 넘어갑니다.`)) return;

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storeId, newOwnerId: userId })
      });
      if (res.ok) {
        alert('양도가 완료되었습니다. 이제 해당 상점에 접근할 수 없습니다.');
        setSearchPhone('');
        setSearchResults([]);
        fetchStores(); // Reload
      } else {
        const err = await res.json();
        alert(`양도 실패: ${err.error}`);
      }
    } catch {
      alert('양도 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteStore = async () => {
    if (!confirm(`[확인] 상점 '${storeName}'을(를) 폐업 처리하시겠습니까?\n모든 출결/급여 기록은 과거 조회용으로 보존되지만, 더 이상 새로운 운영은 불가능해집니다.`)) return;
    
    // 이중 확인
    const confirmName = prompt(`폐업을 진행하시려면 상점 이름 '${storeName}'을(를) 똑같이 입력해주세요.`);
    if (confirmName !== storeName) {
      alert('상점 이름이 일치하지 않아 취소되었습니다.');
      return;
    }

    try {
      const res = await fetch(`/api/store?id=${storeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert('상점이 성공적으로 폐업 처리되었습니다.');
        if (data.remainingStores === 0) {
          router.push('/');
        } else {
          fetchStores(); // Reload
        }
      } else {
        const err = await res.json();
        alert(`폐업 처리 실패: ${err.error}`);
      }
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {stores.map(store => (
                <button 
                  key={store.id}
                  onClick={() => {
                    setStoreId(store.id);
                    setStoreName(store.name);
                    setAddress(store.address || '');
                    setContact(store.contact || '');
                    setRepresentativeName(store.representativeName || '');
                    setBusinessRegNo(store.businessRegNo || '');
                    setWifiIp(store.wifiIpAddress || '');
                    setCurrency(store.currency || '원');
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center ${
                    storeId === store.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {store.name}
                  {store.status === 'CLOSED' && (
                    <span className="ml-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-sm">폐업</span>
                  )}
                </button>
              ))}
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.manage_wifi_auth}</label>
                  <p className="text-xs text-gray-500 mb-2">{t.manage_wifi_desc}</p>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={wifiIp}
                      readOnly
                      placeholder={t.manage_wifi_none}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl focus:outline-none"
                    />
                    <button 
                      onClick={handleRegisterWifi}
                      className="px-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold flex items-center hover:bg-indigo-100 transition-colors"
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
            <div className="bg-red-50 rounded-2xl border border-red-100 p-5 space-y-4">
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
                  placeholder="전화번호 검색 (예: 01012345678)"
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
                      검색
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
                            <p className="font-bold text-gray-900">{user.name || '이름 없음'}</p>
                            <p className="text-sm text-gray-500">{user.phoneNumber || user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTransfer(user.id, user.name || '이름 없음')}
                          className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors text-sm whitespace-nowrap"
                        >
                          양도하기
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 상점 폐업 (Soft Delete) */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Trash2 className="w-32 h-32 text-white" />
              </div>
              <h2 className="font-bold text-lg text-gray-100 flex items-center relative z-10">
                <Store className="w-5 h-5 mr-2" /> 상점 폐업 (운영 종료)
              </h2>
              <p className="text-sm text-gray-400 relative z-10 leading-relaxed">
                해당 상점을 <strong>'폐업'</strong> 상태로 전환합니다.<br />
                폐업 처리 이후에는 해당 상점의 새로운 출퇴근 등록이나 스케줄 관리가 전면 중단됩니다.
              </p>
              
              <button 
                onClick={handleDeleteStore}
                className="w-full py-3.5 bg-gray-800 text-red-400 border border-red-900/30 rounded-xl font-bold hover:bg-red-950 transition-colors flex items-center justify-center relative z-10"
              >
                상점 폐업 처리하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
