'use client';

export type PrintHistoryItem = {
  id: string;
  raw_text: string;
  parsed_data?: string;
  timestamp: string;
  status: string;
};

export async function getPrintHistory(): Promise<PrintHistoryItem[]> {
  const res = await fetch('/api/print-history', { cache: 'no-store' });
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
