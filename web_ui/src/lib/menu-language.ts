'use client';

import type { DeliveryShareOrder } from '@/lib/delivery-share';

export type MenuLanguageRule = {
  id: string;
  matchText: string;
  replacementText: string;
  createdAt?: string;
};

export type MenuLanguageSettings = {
  enabled: boolean;
  mode: 'KOREAN_ONLY' | 'FOREIGN_ONLY' | 'BOTH';
  rules: MenuLanguageRule[];
};

const menuLanguageMemoryCache = new Map<string, MenuLanguageSettings>();

function getMenuLanguageCacheKey(storeId?: string) {
  return storeId || 'default';
}

function cacheMenuLanguageSettings(storeId: string | undefined, settings: MenuLanguageSettings) {
  menuLanguageMemoryCache.set(getMenuLanguageCacheKey(storeId), settings);
}

export async function getMenuLanguageSettings(
  storeId?: string,
  options?: { force?: boolean },
): Promise<MenuLanguageSettings> {
  const cacheKey = getMenuLanguageCacheKey(storeId);
  if (!options?.force) {
    const cached = menuLanguageMemoryCache.get(cacheKey);
    if (cached) return cached;
  }

  const params = new URLSearchParams();
  if (storeId) params.set('storeId', storeId);
  const query = params.toString();
  const res = await fetch(`/api/store/menu-language${query ? `?${query}` : ''}`, { cache: 'no-store' });
  if (!res.ok) return { enabled: false, mode: 'KOREAN_ONLY', rules: [] };
  const data = await res.json() as Partial<MenuLanguageSettings>;
  const settings: MenuLanguageSettings = {
    enabled: Boolean(data.enabled),
    mode: data.mode === 'FOREIGN_ONLY' || data.mode === 'BOTH' ? data.mode : 'KOREAN_ONLY',
    rules: Array.isArray(data.rules) ? data.rules : [],
  };
  cacheMenuLanguageSettings(storeId, settings);
  return settings;
}

export async function updateMenuLanguageMode(storeId: string | undefined, mode: MenuLanguageSettings['mode']) {
  const res = await fetch('/api/store/menu-language', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, mode }),
  });

  if (!res.ok) throw new Error('Failed to update menu language setting');
  const data = await res.json() as { enabled: boolean; mode: MenuLanguageSettings['mode'] };
  const cached = menuLanguageMemoryCache.get(getMenuLanguageCacheKey(storeId));
  if (cached) {
    cacheMenuLanguageSettings(storeId, { ...cached, enabled: data.enabled, mode: data.mode });
  }
  return data;
}

export async function addMenuLanguageRule(storeId: string | undefined, matchText: string, replacementText: string) {
  const res = await fetch('/api/store/menu-language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, matchText, replacementText }),
  });

  if (!res.ok) throw new Error('Failed to save menu language rule');
  const data = await res.json() as { rule: MenuLanguageRule };
  const cached = menuLanguageMemoryCache.get(getMenuLanguageCacheKey(storeId));
  if (cached) {
    cacheMenuLanguageSettings(storeId, { ...cached, rules: [...cached.rules, data.rule] });
  }
  return data;
}

export async function updateMenuLanguageRule(
  storeId: string | undefined,
  id: string,
  matchText: string,
  replacementText: string,
) {
  const res = await fetch('/api/store/menu-language', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, id, matchText, replacementText }),
  });

  if (!res.ok) throw new Error('Failed to update menu language rule');
  const data = await res.json() as { rule: MenuLanguageRule };
  const cached = menuLanguageMemoryCache.get(getMenuLanguageCacheKey(storeId));
  if (cached) {
    cacheMenuLanguageSettings(storeId, {
      ...cached,
      rules: cached.rules.map((rule) => (rule.id === id ? data.rule : rule)),
    });
  }
  return data;
}

export async function deleteMenuLanguageRule(storeId: string | undefined, id: string) {
  const params = new URLSearchParams({ id });
  if (storeId) params.set('storeId', storeId);
  const res = await fetch(`/api/store/menu-language?${params.toString()}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete menu language rule');
  const cached = menuLanguageMemoryCache.get(getMenuLanguageCacheKey(storeId));
  if (cached) {
    cacheMenuLanguageSettings(storeId, {
      ...cached,
      rules: cached.rules.filter((rule) => rule.id !== id),
    });
  }
}

function replaceMenuName(name: string, rules: MenuLanguageRule[]) {
  return rules.reduce((current, rule) => {
    if (!rule.matchText.trim()) return current;
    return current.split(rule.matchText).join(rule.replacementText);
  }, name);
}

export function applyMenuLanguageRules(order: DeliveryShareOrder, settings: MenuLanguageSettings): DeliveryShareOrder {
  if (settings.mode === 'KOREAN_ONLY' || settings.rules.length === 0) return order;

  return {
    ...order,
    items: order.items.map((item) => {
      const translatedName = replaceMenuName(item.name, settings.rules);

      return {
        ...item,
        name: settings.mode === 'BOTH' && translatedName !== item.name
          ? `${item.name} / ${translatedName}`
          : translatedName,
      };
    }),
  };
}
