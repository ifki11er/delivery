'use client';

import { useState } from 'react';
import { History, Phone, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';

type PastHistory = {
  joinedAt: string;
  resignedAt?: string | null;
  workDays: number;
  lateCount: number;
  absentCount: number;
  resignationReason?: string | null;
  resignationNote?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '현재';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export default function EmployeeHistorySearchPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [items, setItems] = useState<PastHistory[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchHistory = async () => {
    const phone = phoneNumber.replace(/\D/g, '');
    if (!phone || loading) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/store/employees/history?phone=${phone}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json() as { items?: PastHistory[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <PageHeader title="과거 근무 히스토리" icon={<History className="h-5 w-5" />} />

      <div className="mx-auto mt-6 max-w-2xl space-y-4 px-4">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">전화번호</span>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ''))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void searchHistory();
                }}
                placeholder="01012345678"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </label>

          <Button
            type="button"
            onClick={() => void searchHistory()}
            disabled={!phoneNumber.replace(/\D/g, '') || loading}
            className="mt-4 h-12 w-full"
          >
            <Search className="mr-2 h-4 w-4" />
            {loading ? '검색 중...' : '검색'}
          </Button>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-black text-gray-900">검색 결과</h2>
          {loading ? (
            <p className="py-8 text-center text-sm font-semibold text-gray-500">조회 중입니다.</p>
          ) : !searched ? (
            <p className="py-8 text-center text-sm font-semibold text-gray-400">직원 등록 전에 전화번호로 과거 근무 이력을 확인하세요.</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-gray-400">해당 전화번호의 과거 근무 히스토리가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.joinedAt}-${item.resignedAt ?? 'active'}-${index}`} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm">
                  <p className="font-black text-indigo-900">
                    {formatDate(item.joinedAt)} ~ {formatDate(item.resignedAt)}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white/80 p-2">
                      <p className="text-[11px] font-bold text-gray-500">총 근무일</p>
                      <p className="mt-1 font-black text-gray-900">{item.workDays}</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-2">
                      <p className="text-[11px] font-bold text-gray-500">지각</p>
                      <p className="mt-1 font-black text-red-600">{item.lateCount}</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-2">
                      <p className="text-[11px] font-bold text-gray-500">결근</p>
                      <p className="mt-1 font-black text-gray-900">{item.absentCount}</p>
                    </div>
                  </div>
                  {item.resignationReason || item.resignationNote ? (
                    <p className="mt-3 rounded-lg bg-white/80 p-3 text-xs font-semibold leading-5 text-gray-600">
                      {item.resignationReason ? `[${item.resignationReason}] ` : ''}
                      {item.resignationNote}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
