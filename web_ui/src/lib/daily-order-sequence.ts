'use client';

export async function nextDailyOrderSequence(storeId?: string | null) {
  const res = await fetch('/api/store/order-sequence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId }),
  });

  if (!res.ok) {
    throw new Error('Failed to issue order sequence.');
  }

  const data = (await res.json()) as { sequence?: number };
  if (typeof data.sequence !== 'number') {
    throw new Error('Invalid order sequence response.');
  }

  return data.sequence;
}
