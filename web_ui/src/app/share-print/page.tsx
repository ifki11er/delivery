'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Printer, XCircle } from 'lucide-react';
import { useStores } from '@/components/providers/StoreProvider';
import {
  createDeliveryPrintHistoryData,
  getDeliverySharePhoneDigits,
  parseDeliveryShareOrder,
  renderDeliveryKitchenOrder,
  renderDeliveryShareReceipt,
} from '@/lib/delivery-share';
import { nextDailyOrderSequence } from '@/lib/daily-order-sequence';
import { addPrintHistory } from '@/lib/print-history';

type BlacklistReport = {
  id?: string;
  reason: string;
  reporterId?: string;
  reporterName?: string | null;
  createdAt: string;
  isMine?: boolean;
};

type BlacklistCheck = {
  isBlacklisted: boolean;
  phoneNumber: string;
  count: number;
  latestDate: string;
  reports: BlacklistReport[];
};

function riskLabel(count: number) {
  if (count >= 3) return '매우 위험';
  if (count === 2) return '위험';
  return '주의';
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SharePrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const rawText = searchParams.get('text') || '';
  const order = useMemo(() => parseDeliveryShareOrder(rawText), [rawText]);
  const [status, setStatus] = useState<'checking' | 'blocked' | 'printing' | 'done' | 'failed'>('printing');
  const [message, setMessage] = useState('출력중...');
  const [blacklist, setBlacklist] = useState<BlacklistCheck | null>(null);

  const saveHistory = async (statusValue: string, parsedData: string) => {
    await addPrintHistory({
      raw_text: rawText,
      parsed_data: parsedData,
      status: statusValue,
      phone: order ? getDeliverySharePhoneDigits(order) : undefined,
    });
  };

  const printOrder = async () => {
    if (!order) {
      setStatus('failed');
      setMessage('배달K 주문 공유 형식이 아닙니다.');
      await saveHistory('FAILED', '지원하지 않는 공유 텍스트 형식입니다.');
      return;
    }

    setStatus('printing');
    setMessage('출력중...');

    try {
      const bridge = window.AndroidBridge;

      if (!bridge?.printBitmapDataUrl) {
        setStatus('failed');
        setMessage('현재 앱이 웹 출력 양식을 지원하지 않습니다. 앱 업데이트가 필요합니다.');
        await saveHistory('FAILED', '앱 업데이트 필요');
        return;
      }

      const orderSequence = await nextDailyOrderSequence(stores[0]?.id);
      const receiptImage = renderDeliveryShareReceipt(order);
      const kitchenImage = renderDeliveryKitchenOrder(order, { orderSequence });
      const success = bridge.printBitmapDataUrl(receiptImage) && bridge.printBitmapDataUrl(kitchenImage);

      if (!success) {
        setStatus('failed');
        setMessage('프린터에 연결할 수 없습니다. 전원과 블루투스 연결을 확인해주세요.');
        await saveHistory('FAILED', order.selectedAddress);
        return;
      }

      await saveHistory('PRINTED', createDeliveryPrintHistoryData(order, orderSequence));
      setStatus('done');
      setMessage('출력 완료!');
      setTimeout(() => router.replace('/store/monitor'), 700);
    } catch (error) {
      console.error(error);
      setStatus('failed');
      setMessage('출력 처리 중 오류가 발생했습니다.');
      await saveHistory('FAILED', order?.selectedAddress || '출력 오류');
    }
  };

  useEffect(() => {
    const run = async () => {
      if (storesLoading) return;

      if (!order) {
        setStatus('failed');
        setMessage('배달K 주문 공유 형식이 아닙니다.');
        await saveHistory('FAILED', '지원하지 않는 공유 텍스트 형식입니다.');
        return;
      }

      try {
        const phone = getDeliverySharePhoneDigits(order);
        const res = await fetch(`/api/blacklist/check?phone=${encodeURIComponent(phone)}`);
        if (res.ok) {
          const data = (await res.json()) as BlacklistCheck;
          if (data.isBlacklisted) {
            setBlacklist({
              ...data,
              reports: [...(data.reports || [])].sort((a, b) => {
                if (a.isMine) return -1;
                if (b.isMine) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }),
            });
            setStatus('blocked');
            setMessage('블랙리스트에 등록된 고객입니다.');
            return;
          }
        }
      } catch (error) {
        console.error(error);
      }

      await printOrder();
    };

    void run();
  }, [storesLoading]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-4">
        <div className={`rounded-2xl border p-5 text-center shadow-sm ${
          status === 'blocked' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'
        }`}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
            {status === 'done' ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : null}
            {status === 'failed' ? <XCircle className="h-8 w-8 text-red-600" /> : null}
            {status === 'blocked' ? <AlertTriangle className="h-8 w-8 text-red-600" /> : null}
            {status === 'checking' || status === 'printing' ? <Printer className="h-8 w-8 text-indigo-600" /> : null}
          </div>
          <h1 className="text-xl font-black text-gray-900">{message}</h1>
          {status === 'checking' || status === 'printing' ? (
            <p className="mt-2 text-sm font-semibold text-gray-500">잠시만 기다려주세요.</p>
          ) : null}
        </div>

        {status === 'blocked' && blacklist ? (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.replace('/store/monitor')}
                className="h-12 flex-1 rounded-xl border border-red-200 bg-white text-sm font-black text-red-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={printOrder}
                className="h-12 flex-1 rounded-xl bg-indigo-600 text-sm font-black text-white"
              >
                계속 출력
              </button>
            </div>

            <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{blacklist.phoneNumber}</h2>
                  <p className="mt-1 text-xs font-bold text-gray-500">{formatDateOnly(blacklist.latestDate)}</p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                  누적 {blacklist.count}건 ({riskLabel(blacklist.count)})
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {blacklist.reports.map((report, index) => (
                  <div key={`${report.createdAt}_${index}`} className={`rounded-xl border p-3 ${
                    report.isMine ? 'border-indigo-100 bg-indigo-50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-800">사유: {report.reason}</p>
                      {report.isMine ? <span className="shrink-0 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">내 제보</span> : null}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-gray-500">
                      {formatDateOnly(report.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {status === 'failed' ? (
          <button
            type="button"
            onClick={() => router.replace('/store/monitor')}
            className="h-12 w-full rounded-xl bg-gray-900 text-sm font-black text-white"
          >
            프린트 관리로 이동
          </button>
        ) : null}
      </div>
    </main>
  );
}

