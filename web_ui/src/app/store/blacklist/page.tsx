'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Search, Plus, UserX, ChevronLeft, Edit3, Save, X, Phone, FileText } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function BlacklistPage() {
  const router = useRouter();
  const t = useI18n();
  const { data: session } = useSession();
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Form
  const [showAdd, setShowAdd] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  // Edit Form
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingReason, setEditingReason] = useState('');
  // Expand Map
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

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
        const errData = await res.json();
        alert(errData.error || t.blacklist_fail || '등록에 실패했습니다.');
      }
    } catch (e) {
      alert(t.blacklist_error || '오류가 발생했습니다.');
    }
  };

  const handleEditSave = async (reportId: string) => {
    if (!editingReason) return;
    try {
      const res = await fetch('/api/blacklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, reason: editingReason })
      });
      if (res.ok) {
        setEditingReportId(null);
        setEditingReason('');
        fetchBlacklist();
      } else {
        alert('수정에 실패했습니다.');
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
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
              {t.blacklist_add_title}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t.blacklist_phone}</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="01012345678"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t.blacklist_reason}</label>
                <div className="relative">
                  <FileText className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="예: 상습 주문 취소, 억지 환불 요구"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                {t.blacklist_submit || '블랙리스트에 등록하기'}
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
            {t.search_btn || '검색'}
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
            blacklist.map(entry => {
              const count = entry.count;
              let borderColor = 'border-yellow-200';
              let badgeColor = 'bg-yellow-100 text-yellow-800';
              let iconColor = 'text-yellow-500';
              let sideColor = 'bg-yellow-500';
              let levelText = '주의';
              
              if (count === 2) {
                borderColor = 'border-orange-200';
                badgeColor = 'bg-orange-100 text-orange-800';
                iconColor = 'text-orange-500';
                sideColor = 'bg-orange-500';
                levelText = '위험';
              } else if (count >= 3) {
                borderColor = 'border-red-200';
                badgeColor = 'bg-red-100 text-red-800';
                iconColor = 'text-red-500';
                sideColor = 'bg-red-500';
                levelText = '매우 위험';
              }

              // 내 제보가 가장 위로 오도록 정렬, 그다음은 최신순
              const sortedReports = [...entry.reports].sort((a: any, b: any) => {
                if (a.reporterId === session?.user?.id) return -1;
                if (b.reporterId === session?.user?.id) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });

              const isExpanded = expandedMap[entry.phoneNumber] || false;
              const displayReports = isExpanded || count === 1 ? sortedReports : [sortedReports[0]];

              return (
                <div key={entry.phoneNumber} className={`bg-white p-5 rounded-2xl shadow-sm border ${borderColor} relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${sideColor}`}></div>
                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-xl text-gray-900 tracking-tight">
                          {formatPhone(entry.phoneNumber)}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
                          누적 {count}건 ({levelText})
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">최근 제보일</p>
                      <p className="text-xs font-medium text-gray-600">
                        {new Date(entry.latestDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pl-2 space-y-2">
                    {displayReports.map((rep: any) => (
                      <div key={rep.id} className={`p-3 rounded-xl border ${rep.reporterId === session?.user?.id ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                        {editingReportId === rep.id ? (
                          <div className="flex flex-col space-y-2">
                            <input 
                              type="text" 
                              value={editingReason}
                              onChange={(e) => setEditingReason(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 text-sm"
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => setEditingReportId(null)} className="text-xs text-gray-500 font-bold px-2 py-1 flex items-center hover:bg-gray-200 rounded">
                                <X className="w-3 h-3 mr-1" /> 취소
                              </button>
                              <button onClick={() => handleEditSave(rep.id)} className="text-xs text-white bg-indigo-600 font-bold px-2 py-1 flex items-center hover:bg-indigo-700 rounded">
                                <Save className="w-3 h-3 mr-1" /> 저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-gray-800 flex-1">
                                {t.blacklist_reason}: {rep.reason}
                              </p>
                              {rep.reporterId === session?.user?.id && (
                                <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black shrink-0">내 제보</span>
                              )}
                            </div>
                            <div className="mt-2 flex justify-between items-center">
                              <div className="text-xs text-gray-500 flex items-center">
                                <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-md mr-2">{t.blacklist_reporter}</span> 
                                {rep.reporterName || t.blacklist_anon}
                              </div>
                              {session?.user?.id === rep.reporterId && (
                                <button 
                                  onClick={() => {
                                    setEditingReportId(rep.id);
                                    setEditingReason(rep.reason);
                                  }}
                                  className="text-xs text-indigo-600 font-bold flex items-center hover:underline"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" /> 수정
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {count > 1 && (
                      <button 
                        onClick={() => setExpandedMap(prev => ({ ...prev, [entry.phoneNumber]: !prev[entry.phoneNumber] }))}
                        className="w-full mt-2 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-dashed border-gray-200"
                      >
                        {isExpanded ? '▲ 접기' : `▼ 다른 사유 ${count - 1}개 더 보기`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
