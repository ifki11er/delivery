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
  rules: MenuLanguageRule[];
};

export async function getMenuLanguageSettings(storeId?: string): Promise<MenuLanguageSettings> {
  const params = new URLSearchParams();
  if (storeId) params.set('storeId', storeId);
  const query = params.toString();
  const res = await fetch(`/api/store/menu-language${query ? `?${query}` : ''}`, { cache: 'no-store' });
  if (!res.ok) return { enabled: false, rules: [] };
  const data = await res.json() as Partial<MenuLanguageSettings>;
  return {
    enabled: Boolean(data.enabled),
    rules: Array.isArray(data.rules) ? data.rules : [],
  };
}

export async function updateMenuLanguageEnabled(storeId: string | undefined, enabled: boolean) {
  const res = await fetch('/api/store/menu-language', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, enabled }),
  });

  if (!res.ok) throw new Error('Failed to update menu language setting');
  return res.json() as Promise<{ enabled: boolean }>;
}

export async function addMenuLanguageRule(storeId: string | undefined, matchText: string, replacementText: string) {
  const res = await fetch('/api/store/menu-language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, matchText, replacementText }),
  });

  if (!res.ok) throw new Error('Failed to save menu language rule');
  return res.json() as Promise<{ rule: MenuLanguageRule }>;
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
  return res.json() as Promise<{ rule: MenuLanguageRule }>;
}

export async function deleteMenuLanguageRule(storeId: string | undefined, id: string) {
  const params = new URLSearchParams({ id });
  if (storeId) params.set('storeId', storeId);
  const res = await fetch(`/api/store/menu-language?${params.toString()}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete menu language rule');
}

function replaceMenuName(name: string, rules: MenuLanguageRule[]) {
  return rules.reduce((current, rule) => {
    if (!rule.matchText.trim()) return current;
    return current.split(rule.matchText).join(rule.replacementText);
  }, name);
}

export function applyMenuLanguageRules(order: DeliveryShareOrder, settings: MenuLanguageSettings): DeliveryShareOrder {
  if (!settings.enabled || settings.rules.length === 0) return order;

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      name: replaceMenuName(item.name, settings.rules),
    })),
  };
}
