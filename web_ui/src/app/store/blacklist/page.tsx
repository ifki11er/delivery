'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, Plus, UserX, ChevronLeft } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function BlacklistPage() {
  const router = useRouter();
  const t = useI18n();
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Form
  const [showAdd, setShowAdd] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');

  const fetchBlacklist = async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blacklist?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        setBlacklist(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBlacklist(searchQuery);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || !newReason) {
      alert(t.blacklist_req || '전화번호와 사유를 모두 입력해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone, reason: newReason })
      });
      if (res.ok) {
        alert(t.blacklist_success || '블랙리스트에 등록되었습니다. 이제부터 해당 번호 주문 시 영수증에 표기됩니다.');
        setShowAdd(false);
        setNewPhone('');
        setNewReason('');
        fetchBlacklist();
      } else {
        alert(t.blacklist_fail || '등록에 실패했습니다.');
      }
    } catch (e) {
      alert(t.blacklist_error || '오류가 발생했습니다.');
    }
  };

  // Format phone number for display (e.g. 01012345678 -> 010-1234-5678)
  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0,3)}-${phone.slice(3,7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="font-bold text-lg text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" /> {t.mypage_blacklist}
            </h1>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)} 
            className="text-red-600 bg-red-50 p-2 rounded-lg font-bold flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" /> {t.blacklist_add}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
        
        {/* Add Form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 bg-red-50/10">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center">
              <UserX className="w-5 h-5 mr-2 text-red-500" /> {t.blacklist_add_title}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t.blacklist_phone}</label>
                <input 
                  type="text" 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="01012345678"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t.blacklist_reason}</label>
                <input 
                  type="text" 
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="예: 상습 주문 취소, 억지 환불 요구"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                {t.blacklist_submit}
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.blacklist_search}
            className="w-full pl-12 pr-4 py-3.5 bg-white shadow-sm border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
          />
          <button type="submit" className="absolute right-3 top-2.5 px-4 py-1.5 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200">
            {t.search_btn}
          </button>
        </form>

        {/* List */}
        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="text-center py-10 text-gray-500">{t.mypage_loading}</div>
          ) : blacklist.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              {t.blacklist_empty}
            </div>
          ) : (
            blacklist.map(entry => (
              <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="font-black text-xl text-gray-900 tracking-tight">
                      {formatPhone(entry.phoneNumber)}
                    </h3>
                    <p className="text-sm font-bold text-red-600 mt-1 bg-red-50 inline-block px-2 py-0.5 rounded-md">
                      {t.blacklist_reason}: {entry.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{t.blacklist_date}</p>
                    <p className="text-xs font-medium text-gray-600">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 pl-2 text-xs text-gray-500 flex items-center">
                  <span className="bg-gray-100 px-2 py-1 rounded-md mr-2 text-gray-600">{t.blacklist_reporter}</span> 
                  {entry.reporter.name || t.blacklist_anon}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
