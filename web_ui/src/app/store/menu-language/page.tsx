'use client';

import { useEffect, useState } from 'react';
import { Edit3, Languages, Plus, Save, Trash2, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useStores } from '@/components/providers/StoreProvider';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import PageHeader from '@/components/layout/PageHeader';
import {
  addMenuLanguageRule,
  deleteMenuLanguageRule,
  getMenuLanguageSettings,
  type MenuLanguageRule,
  updateMenuLanguageRule,
  updateMenuLanguageEnabled,
} from '@/lib/menu-language';

export default function MenuLanguagePage() {
  const t = useI18n();
  const { stores, loading: storesLoading } = useStores();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<MenuLanguageRule[]>([]);
  const [matchText, setMatchText] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState('');
  const [editingMatchText, setEditingMatchText] = useState('');
  const [editingReplacementText, setEditingReplacementText] = useState('');

  const storeId = stores[0]?.id;

  const loadSettings = async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getMenuLanguageSettings(storeId);
      setEnabled(data.enabled);
      setRules(data.rules);
    } catch (error) {
      console.error(error);
      alert(t.menu_language_load_failed || '메뉴언어 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storesLoading) return;
    void loadSettings();
  }, [storesLoading, storeId]);

  const handleToggle = async (checked: boolean) => {
    if (!storeId) return;
    setEnabled(checked);
    try {
      await updateMenuLanguageEnabled(storeId, checked);
    } catch {
      setEnabled(!checked);
      alert(t.menu_language_save_failed || '저장에 실패했습니다.');
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
      alert(t.menu_language_save_failed || '저장에 실패했습니다.');
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
      alert(t.delete_failed || '삭제에 실패했습니다.');
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
      const { rule } = await updateMenuLanguageRule(
        storeId,
        editingRuleId,
        editingMatchText,
        editingReplacementText,
      );
      setRules((current) => current.map((item) => (item.id === rule.id ? rule : item)));
      cancelEdit();
    } catch {
      alert(t.menu_language_save_failed || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!storesLoading && stores.length === 0) {
    return <StoreRequiredNotice />;
  }

  return (
    <main className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={t.menu_language_title || '메뉴언어관리'}
        icon={<Languages className="w-5 h-5 text-indigo-600" />}
      />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <label className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900">
                {t.menu_language_enable_title || '언어변경 사용'}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
                {t.menu_language_enable_desc || '체크하면 배달K 주문서 출력 시 메뉴명이 아래 규칙대로 변경됩니다.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => void handleToggle(event.target.checked)}
              className="mt-1 h-6 w-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </section>

        <form onSubmit={handleAdd} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-base font-black text-gray-900">{t.menu_language_add_rule || '매칭 규칙 추가'}</h2>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              {t.menu_language_match_text || '매치되는 글자'}
            </label>
            <input
              value={matchText}
              onChange={(event) => setMatchText(event.target.value)}
              placeholder="예: 모짜더블피자"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              {t.menu_language_replacement_text || '변경해야 하는 글자'}
            </label>
            <input
              value={replacementText}
              onChange={(event) => setReplacementText(event.target.value)}
              placeholder="예: Mozza Double Pizza"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={!matchText.trim() || !replacementText.trim() || saving}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-black text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t.mini_add_item || '추가'}
          </button>
        </form>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-900 mb-3">{t.menu_language_rule_list || '매칭 규칙'}</h2>
          {loading ? (
            <div className="py-8 text-center text-sm font-semibold text-gray-400">{t.mypage_loading}</div>
          ) : rules.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-gray-400">
              {t.menu_language_empty || '등록된 매칭 규칙이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  {editingRuleId === rule.id ? (
                    <>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          value={editingMatchText}
                          onChange={(event) => setEditingMatchText(event.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-indigo-500"
                        />
                        <input
                          value={editingReplacementText}
                          onChange={(event) => setEditingReplacementText(event.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => void handleUpdate()}
                          disabled={!editingMatchText.trim() || !editingReplacementText.trim() || saving}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                          title={t.mypage_save || '저장'}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                          title={t.mypage_cancel || '취소'}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-gray-900">{rule.matchText}</p>
                        <p className="truncate text-sm font-bold text-indigo-600">{rule.replacementText}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(rule)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50"
                          title={t.mypage_edit || '수정'}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(rule.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-600 border border-red-100 hover:bg-red-50"
                          title={t.mini_delete || '삭제'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
