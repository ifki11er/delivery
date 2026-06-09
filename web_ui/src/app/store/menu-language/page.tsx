'use client';

import { useEffect, useState } from 'react';
import { Edit3, Languages, Plus, Save, Trash2, X } from 'lucide-react';
import { useStores } from '@/components/providers/StoreProvider';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import PageHeader from '@/components/layout/PageHeader';
import {
  addMenuLanguageRule,
  deleteMenuLanguageRule,
  getMenuLanguageSettings,
  type MenuLanguageRule,
  type MenuLanguageSettings,
  updateMenuLanguageMode,
  updateMenuLanguageRule,
} from '@/lib/menu-language';

const MODE_OPTIONS: Array<{ value: MenuLanguageSettings['mode']; label: string }> = [
  { value: 'KOREAN_ONLY', label: '한글만' },
  { value: 'FOREIGN_ONLY', label: '외국어만' },
  { value: 'BOTH', label: '한글+외국어' },
];
const activeStoreStorageKey = 'store_active_selected_store_id';
const monitorStoreStorageKey = 'store_monitor_selected_store_id';
const miniReceiptStoreStorageKey = 'mini_receipt_selected_store_id';

export default function MenuLanguagePage() {
  const { stores, loading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const selectedStore = stores.find((store) => store.id === selectedStoreId) || stores[0] || null;
  const storeId = selectedStore?.id;
  const [mode, setMode] = useState<MenuLanguageSettings['mode'] | null>(null);
  const [rules, setRules] = useState<MenuLanguageRule[]>([]);
  const [matchText, setMatchText] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState('');
  const [editingMatchText, setEditingMatchText] = useState('');
  const [editingReplacementText, setEditingReplacementText] = useState('');

  const loadSettings = async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getMenuLanguageSettings(storeId);
      setMode(data.mode);
      setRules(data.rules);
    } catch {
      alert('메뉴언어 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storesLoading || stores.length === 0 || selectedStoreId) return;

    const storedStoreId = localStorage.getItem(activeStoreStorageKey)
      || localStorage.getItem(monitorStoreStorageKey)
      || localStorage.getItem(miniReceiptStoreStorageKey);
    const nextStoreId = storedStoreId && stores.some((store) => store.id === storedStoreId)
      ? storedStoreId
      : stores[0].id;
    setSelectedStoreId(nextStoreId);
  }, [selectedStoreId, stores, storesLoading]);

  useEffect(() => {
    if (selectedStoreId) {
      localStorage.setItem(activeStoreStorageKey, selectedStoreId);
      localStorage.setItem(monitorStoreStorageKey, selectedStoreId);
      localStorage.setItem(miniReceiptStoreStorageKey, selectedStoreId);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (storesLoading || !storeId) return;
    void loadSettings();
  }, [storesLoading, storeId]);

  const handleModeChange = async (nextMode: MenuLanguageSettings['mode']) => {
    if (!storeId || nextMode === mode) return;

    const prevMode = mode;
    setMode(nextMode);
    try {
      await updateMenuLanguageMode(storeId, nextMode);
    } catch {
      setMode(prevMode ?? 'KOREAN_ONLY');
      alert('저장에 실패했습니다.');
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId || !matchText.trim() || !replacementText.trim() || saving) return;

    setSaving(true);
    try {
      await addMenuLanguageRule(storeId, matchText, replacementText);
      setMatchText('');
      setReplacementText('');
      await loadSettings();
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (rule: MenuLanguageRule) => {
    setEditingRuleId(rule.id);
    setEditingMatchText(rule.matchText);
    setEditingReplacementText(rule.replacementText);
  };

  const cancelEdit = () => {
    setEditingRuleId('');
    setEditingMatchText('');
    setEditingReplacementText('');
  };

  const handleUpdate = async () => {
    if (!storeId || !editingRuleId || !editingMatchText.trim() || !editingReplacementText.trim() || saving) return;

    setSaving(true);
    try {
      const { rule } = await updateMenuLanguageRule(storeId, editingRuleId, editingMatchText, editingReplacementText);
      setRules((current) => current.map((item) => (item.id === rule.id ? rule : item)));
      cancelEdit();
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!storeId) return;

    try {
      await deleteMenuLanguageRule(storeId, id);
      setRules((current) => current.filter((rule) => rule.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  if (!storesLoading && stores.length === 0) {
    return <StoreRequiredNotice />;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <PageHeader title="메뉴언어관리" subtitle={selectedStore?.name || ''} icon={<Languages className="h-5 w-5 text-indigo-600" />} />

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {stores.length > 1 ? (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-xs font-black text-gray-500">상점 선택</label>
            <select
              value={storeId || ''}
              onChange={(event) => {
                setSelectedStoreId(event.target.value);
                setMode(null);
                setRules([]);
                cancelEdit();
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </section>
        ) : null}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-900">출력언어 선택</h2>
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {MODE_OPTIONS.map((item) => {
              const selected = mode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={loading || !mode}
                  onClick={() => void handleModeChange(item.value)}
                  className={`h-12 text-sm font-black transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-indigo-50 disabled:text-gray-300 disabled:hover:bg-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <form onSubmit={handleAdd} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-900">매장 규칙 추가</h2>
          <input
            value={matchText}
            onChange={(event) => setMatchText(event.target.value)}
            placeholder="매치되는 메뉴명"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
          />
          <input
            value={replacementText}
            onChange={(event) => setReplacementText(event.target.value)}
            placeholder="변경할 메뉴명"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!matchText.trim() || !replacementText.trim() || saving}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-black text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </form>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-black text-gray-900">매장 규칙</h2>
          {loading ? (
            <div className="py-8 text-center text-sm font-semibold text-gray-400">불러오는 중입니다.</div>
          ) : rules.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-gray-400">등록된 매장 규칙이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex min-w-0 items-start gap-3 rounded-xl bg-gray-50 p-3">
                  {editingRuleId === rule.id ? (
                    <>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          value={editingMatchText}
                          onChange={(event) => setEditingMatchText(event.target.value)}
                          className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-indigo-500"
                        />
                        <input
                          value={editingReplacementText}
                          onChange={(event) => setEditingReplacementText(event.target.value)}
                          className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button type="button" onClick={() => void handleUpdate()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <Save className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={cancelEdit} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-normal break-words text-sm font-black text-gray-900">{rule.matchText}</p>
                        <p className="whitespace-normal break-words text-sm font-bold text-indigo-600">{rule.replacementText}</p>
                      </div>
                      <button type="button" onClick={() => startEdit(rule)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void handleDelete(rule.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
