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
import { applyMenuLanguageRules, getMenuLanguageSettings } from '@/lib/menu-language';

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

const monitorStoreStorageKey = 'store_monitor_selected_store_id';

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

function finishSharePrintOrNavigate(router: ReturnType<typeof useRouter>) {
  const closedByApp = window.AndroidBridge?.finishSharePrint?.() ?? false;
  if (!closedByApp) {
    router.replace('/app#monitor');
  }
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
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
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [storeSelectionReady, setStoreSelectionReady] = useState(false);
  const preferredStore = stores.find((store) => store.id === selectedStoreId) || stores[0] || null;
  const preferredStoreId = preferredStore?.id || '';

  useEffect(() => {
    if (storesLoading) return;

    if (stores.length === 0) {
      setStoreSelectionReady(true);
      return;
    }

    const storedStoreId = localStorage.getItem(monitorStoreStorageKey);
    const nextStoreId = storedStoreId && stores.some((store) => store.id === storedStoreId)
      ? storedStoreId
      : stores[0].id;
    setSelectedStoreId(nextStoreId);
    setStoreSelectionReady(true);
  }, [stores, storesLoading]);

  const saveHistory = async (statusValue: string, parsedData: string) => {
    await addPrintHistory({
      storeId: preferredStoreId,
      raw_text: rawText,
      parsed_data: parsedData,
      status: statusValue,
      phone: order ? getDeliverySharePhoneDigits(order) : undefined,
    });
  };

  const showStep = async (nextStatus: typeof status, nextMessage: string) => {
    setStatus(nextStatus);
    setMessage(nextMessage);
    await waitForPaint();
  };

  const printOrder = async () => {
    if (!order) {
      setStatus('failed');
      setMessage('배달K 주문 공유 형식이 아닙니다.');
      await saveHistory('FAILED', '지원하지 않는 공유 텍스트 형식입니다.');
      return;
    }

    await showStep('printing', '프린터 준비 확인 중...');

    try {
      const bridge = window.AndroidBridge;

      if (!bridge?.printBitmapDataUrl) {
        setStatus('failed');
        setMessage('현재 앱이 웹 출력 양식을 지원하지 않습니다. 앱 업데이트가 필요합니다.');
        await saveHistory('FAILED', '앱 업데이트 필요');
        return;
      }

      await showStep('printing', '주문순서 발급 중...');
      const orderSequence = await nextDailyOrderSequence(preferredStoreId);

      await showStep('printing', '메뉴 언어 설정 확인 중...');
      const menuLanguageSettings = await getMenuLanguageSettings(preferredStoreId);
      const printableOrder = applyMenuLanguageRules(order, menuLanguageSettings);

      await showStep('printing', '일반 주문서 이미지 생성 중...');
      const receiptImage = renderDeliveryShareReceipt(printableOrder);

      await showStep('printing', '주방 주문서 이미지 생성 중...');
      const kitchenImage = renderDeliveryKitchenOrder(printableOrder, { orderSequence });

      await showStep('printing', '일반 주문서 프린터 전송 중...');
      const receiptPrinted = bridge.printBitmapDataUrl(receiptImage);

      await showStep('printing', '주방 주문서 프린터 전송 중...');
      const kitchenPrinted = receiptPrinted && bridge.printBitmapDataUrl(kitchenImage);
      const success = receiptPrinted && kitchenPrinted;

      if (!success) {
        setStatus('failed');
        setMessage('프린터에 연결할 수 없습니다. 전원과 블루투스 연결을 확인해주세요.');
        await saveHistory('FAILED', order.selectedAddress);
        return;
      }

      await showStep('printing', '출력 이력 저장 중...');
      await saveHistory('PRINTED', createDeliveryPrintHistoryData(printableOrder, orderSequence));
      setStatus('done');
      setMessage('출력 완료!');
      setTimeout(() => finishSharePrintOrNavigate(router), 700);
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
      if (!storeSelectionReady) return;

      if (!order) {
        setStatus('failed');
        setMessage('배달K 주문 공유 형식이 아닙니다.');
        await saveHistory('FAILED', '지원하지 않는 공유 텍스트 형식입니다.');
        return;
      }

      try {
        await showStep('checking', '출력 설정 확인 중...');
        const settingRes = await fetch(`/api/store/blacklist-check-setting?storeId=${encodeURIComponent(preferredStoreId)}`);
        const setting = settingRes.ok ? await settingRes.json() as { enabled?: boolean } : { enabled: true };
        if (setting.enabled !== false) {
          await showStep('checking', '비매너고객 전화번호 조회 중...');
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
              setMessage('비매너고객에 등록된 고객입니다.');
              return;
            }
          }
        }
      } catch (error) {
        console.error(error);
      }

      await printOrder();
    };

    void run();
  }, [storeSelectionReady, storesLoading]);

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
                onClick={() => router.replace('/app#monitor')}
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
            onClick={() => router.replace('/app#monitor')}
            className="h-12 w-full rounded-xl bg-gray-900 text-sm font-black text-white"
          >
            프린트 관리로 이동
          </button>
        ) : null}
      </div>
    </main>
  );
}

