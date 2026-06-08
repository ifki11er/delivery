'use client';

export type PrintHistoryItem = {
  id: string;
  raw_text: string;
  parsed_data?: string;
  timestamp: string;
  status: string;
};

export async function getPrintHistory(options?: {
  from?: string;
  to?: string;
}): Promise<PrintHistoryItem[]> {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const query = params.toString();
  const res = await fetch(`/api/print-history${query ? `?${query}` : ''}`, { cache: 'no-store' });
  if (!res.ok) return [];

  const data = await res.json() as { items?: PrintHistoryItem[] };
  return data.items ?? [];
}

export async function addPrintHistory(item: {
  raw_text: string;
  parsed_data?: string;
  status: string;
  phone?: string;
}) {
  const res = await fetch('/api/print-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText: item.raw_text,
      parsedData: item.parsed_data,
      status: item.status,
      phone: item.phone,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json() as { item?: PrintHistoryItem };
  return data.item ?? null;
}
