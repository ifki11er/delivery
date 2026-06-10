'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Search, Plus, Edit3, Save, X, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PageHeader from '@/components/layout/PageHeader';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import type { BlacklistEntry } from '@/types/store-management';

const blacklistMemoryCache = new Map<string, BlacklistEntry[]>();
const MAX_REASON_LENGTH = 100;

function formatDateOnly(value?: string | Date | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BlacklistPage() {
  const t = useI18n();
  const { confirm } = useFeedback();
  const { data: session } = useSession();
  const { stores, loading: storesLoading, hasStore } = useStores();
  const storeId = stores[0]?.id || '';
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blacklistCheckEnabled, setBlacklistCheckEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingReason, setEditingReason] = useState('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const fetchBlacklist = async (q = '', force = false) => {
    try {
      const trimmedQuery = q.trim();
      const cacheKey = trimmedQuery ? `q:${trimmedQuery}` : 'mine';
      if (!force && blacklistMemoryCache.has(cacheKey)) {
        setBlacklist(blacklistMemoryCache.get(cacheKey) ?? []);
        setLoading(false);
        return;
      }

      setLoading(true);
      const params = new URLSearchParams();
      if (trimmedQuery) {
        params.set('q', trimmedQuery);
      } else {
        params.set('mine', '1');
      }
      const res = await fetch(`/api/blacklist?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as BlacklistEntry[];
        blacklistMemoryCache.set(cacheKey, data);
        setBlacklist(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storesLoading) return;
    if (!hasStore) {
      setLoading(false);
      return;
    }
    void fetchBlacklist();
  }, [hasStore, storesLoading]);

  useEffect(() => {
    if (!storeId) return;

    fetch(`/api/store/blacklist-check-setting?storeId=${encodeURIComponent(storeId)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as { enabled?: boolean };
        setBlacklistCheckEnabled(data.enabled !== false);
      })
      .catch(() => undefined);
  }, [storeId]);

  const updateBlacklistCheckEnabled = async (enabled: boolean) => {
    if (!storeId) return;

    const previous = blacklistCheckEnabled;
    setBlacklistCheckEnabled(enabled);
    try {
      const res = await fetch('/api/store/blacklist-check-setting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, enabled }),
      });
      if (!res.ok) throw new Error('Failed to update setting');
    } catch {
      setBlacklistCheckEnabled(previous);
      alert('저장에 실패했습니다.');
    }
  };

  const { refreshing } = usePullToRefresh({
    disabled: storesLoading || !hasStore,
    onRefresh: async () => {
      await fetchBlacklist(searchQuery, true);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchBlacklist(searchQuery);
  };

  const handleEditSave = async (reportId: string) => {
    if (!editingReason) return;

    try {
      const res = await fetch('/api/blacklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, reason: editingReason }),
      });

      if (res.ok) {
        setEditingReportId(null);
        setEditingReason('');
        void fetchBlacklist(searchQuery, true);
      } else {
        alert(t.blacklist_edit_fail);
      }
    } catch {
      alert(t.blacklist_error);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!(await confirm({
      title: '비매너고객 제보 삭제',
      message: '정말로 이 비매너고객 제보를 삭제하시겠습니까?',
      danger: true,
      confirmText: '삭제',
    }))) return;

    try {
      const res = await fetch(`/api/blacklist?id=${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setEditingReportId(null);
        setEditingReason('');
        void fetchBlacklist(searchQuery, true);
      } else {
        alert(t.delete_failed);
      }
    } catch {
      alert(t.blacklist_error);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  const getRiskMeta = (count: number) => {
    if (count >= 3) {
      return {
        borderColor: 'border-red-200',
        badgeColor: 'bg-red-100 text-red-800',
        sideColor: 'bg-red-500',
        levelText: t.blacklist_level_high_danger,
      };
    }

    if (count === 2) {
      return {
        borderColor: 'border-orange-200',
        badgeColor: 'bg-orange-100 text-orange-800',
        sideColor: 'bg-orange-500',
        levelText: t.blacklist_level_danger,
      };
    }

    return {
      borderColor: 'border-yellow-200',
      badgeColor: 'bg-yellow-100 text-yellow-800',
      sideColor: 'bg-yellow-500',
      levelText: t.blacklist_level_caution,
    };
  };

  if (!storesLoading && !hasStore) {
    return <StoreRequiredNotice />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={t.mypage_blacklist}
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        actions={(
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('worklink-app-navigate', { detail: { tab: 'blacklistNew' } }))}
            className="text-red-600 bg-red-50 p-2 rounded-lg font-bold flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t.blacklist_add}
          </button>
        )}
      />

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
        <p className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs font-semibold leading-5 text-gray-500 shadow-sm">
          현재 리스트는 내가 제보한 리스트만 나옵니다. 검색을 하면 내가 제보하지 않은 리스트도 확인 가능합니다.
        </p>

        <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm">
          <input
            type="checkbox"
            checked={blacklistCheckEnabled}
            onChange={(event) => void updateBlacklistCheckEnabled(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span>배달K 공유 주문 출력 전에 비매너고객을 확인합니다.</span>
        </label>

        {refreshing && (
          <div className="rounded-xl bg-red-50 px-4 py-2 text-center text-xs font-bold text-red-600">
            새로고침 중...
          </div>
        )}

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

        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="text-center py-10 text-gray-500">{t.mypage_loading}</div>
          ) : blacklist.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              {t.blacklist_empty}
            </div>
          ) : (
            blacklist.map((entry) => {
              const count = entry.count;
              const risk = getRiskMeta(count);
              const sortedReports = [...entry.reports].sort((a, b) => {
                if (a.reporterId === session?.user?.id) return -1;
                if (b.reporterId === session?.user?.id) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });
              const isExpanded = expandedMap[entry.phoneNumber] || false;
              const displayReports = isExpanded || count === 1 ? sortedReports : [sortedReports[0]];

              return (
                <div key={entry.phoneNumber} className={`bg-white p-5 rounded-2xl shadow-sm border ${risk.borderColor} relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${risk.sideColor}`} />
                  <div className="flex justify-between items-start pl-2 gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="font-black text-xl text-gray-900 tracking-tight">{formatPhone(entry.phoneNumber)}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${risk.badgeColor}`}>
                          {t.blacklist_count_badge.replace('{count}', String(count)).replace('{level}', risk.levelText)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-600">{formatDateOnly(entry.latestDate)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pl-2 space-y-2">
                    {displayReports.map((rep) => (
                      <div key={rep.id} className={`p-3 rounded-xl border ${rep.reporterId === session?.user?.id ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                        {editingReportId === rep.id ? (
                          <div className="flex flex-col space-y-2">
                            <input
                              type="text"
                              value={editingReason}
                              maxLength={MAX_REASON_LENGTH}
                              onChange={(e) => setEditingReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 text-sm"
                            />
                            <p className="text-right text-[11px] font-semibold text-gray-400">
                              {editingReason.length}/{MAX_REASON_LENGTH}자 이내
                            </p>
                            <div className="flex justify-end space-x-2">
                              <button type="button" onClick={() => setEditingReportId(null)} className="text-xs text-gray-500 font-bold px-2 py-1 flex items-center hover:bg-gray-200 rounded">
                                <X className="w-3 h-3 mr-1" />
                                {t.mypage_cancel}
                              </button>
                              <button type="button" onClick={() => handleEditSave(rep.id)} className="text-xs text-white bg-indigo-600 font-bold px-2 py-1 flex items-center hover:bg-indigo-700 rounded">
                                <Save className="w-3 h-3 mr-1" />
                                {t.mypage_save}
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
                                <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black shrink-0">{t.blacklist_my_report}</span>
                              )}
                            </div>
                            <div className="mt-2 flex justify-between items-center">
                              <div className="text-xs font-semibold text-gray-500">{formatDateOnly(rep.createdAt)}</div>
                              {session?.user?.id === rep.reporterId && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReportId(rep.id);
                                      setEditingReason(rep.reason);
                                    }}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                    title={t.mypage_edit}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(rep.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {count > 1 && (
                      <button
                        onClick={() => setExpandedMap((prev) => ({ ...prev, [entry.phoneNumber]: !prev[entry.phoneNumber] }))}
                        className="w-full mt-2 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-dashed border-gray-200"
                      >
                        {isExpanded ? t.blacklist_collapse : t.blacklist_more_reasons.replace('{count}', String(count - 1))}
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

