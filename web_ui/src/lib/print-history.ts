'use client';

export type PrintHistoryItem = {
  id: string;
  raw_text: string;
  parsed_data?: string;
  timestamp: string;
  status: string;
};

const historyRequestCache = new Map<string, { timestamp: number; promise: Promise<PrintHistoryItem[]> }>();
const historyMemoryCache = new Map<string, PrintHistoryItem[]>();
const HISTORY_REQUEST_DEDUPE_MS = 1000;

function getHistoryRequestKey(options?: {
  storeId?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (options?.storeId) params.set('storeId', options.storeId);
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const query = params.toString();
  return {
    requestKey: query || 'all',
    query,
  };
}

export function getCachedPrintHistory(options?: {
  storeId?: string;
  from?: string;
  to?: string;
}) {
  return historyMemoryCache.get(getHistoryRequestKey(options).requestKey) ?? null;
}

export async function getPrintHistory(options?: {
  storeId?: string;
  from?: string;
  to?: string;
  force?: boolean;
}): Promise<PrintHistoryItem[]> {
  const { requestKey, query } = getHistoryRequestKey(options);

  if (!options?.force) {
    const memoryCached = historyMemoryCache.get(requestKey);
    if (memoryCached) return memoryCached;
  }

  const cached = historyRequestCache.get(requestKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < HISTORY_REQUEST_DEDUPE_MS) {
    return cached.promise;
  }

  const promise = fetch(`/api/print-history${query ? `?${query}` : ''}`, { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) return [];
      const data = await res.json() as { items?: PrintHistoryItem[] };
      const items = data.items ?? [];
      historyMemoryCache.set(requestKey, items);
      return items;
    })
    .finally(() => {
      setTimeout(() => historyRequestCache.delete(requestKey), HISTORY_REQUEST_DEDUPE_MS);
    });

  historyRequestCache.set(requestKey, { timestamp: now, promise });
  return promise;
}

export async function addPrintHistory(item: {
  storeId?: string;
  raw_text: string;
  parsed_data?: string;
  status: string;
  phone?: string;
}) {
  const res = await fetch('/api/print-history', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: item.storeId,
      rawText: item.raw_text,
      parsedData: item.parsed_data,
      status: item.status,
      phone: item.phone,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json() as { item?: PrintHistoryItem };
  if (data.item) {
    historyMemoryCache.clear();
    historyRequestCache.clear();
  }
  return data.item ?? null;
}
