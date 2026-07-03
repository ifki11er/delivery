"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bluetooth, BluetoothConnected, CalendarDays, ChevronDown, ChevronUp, Hash, LoaderCircle, MoreVertical, Printer, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { StoreRequiredNotice } from "@/components/store/StoreRequiredNotice";
import { useStores } from "@/components/providers/StoreProvider";
import { useFeedback } from "@/components/providers/FeedbackProvider";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PageHeader from "@/components/layout/PageHeader";
import { deletePrintHistory, getCachedPrintHistory, getPrintHistory } from "@/lib/print-history";
import {
  getDeliveryPrintHistoryDetail,
  getDeliveryPrintHistorySequence,
  getDeliveryPrintHistorySummary,
  parseDeliveryShareOrder,
  renderDeliveryKitchenOrder,
  renderDeliveryShareReceipt,
} from "@/lib/delivery-share";
import { nextDailyOrderSequence } from "@/lib/daily-order-sequence";
import { applyMenuLanguageRules, getMenuLanguageSettings } from "@/lib/menu-language";

type ConnectionStatus = "idle" | "ready" | "connecting" | "success" | "failed" | "error";
type HistoryTab = "active" | "deleted";
const monitorStoreStorageKey = "store_monitor_selected_store_id";

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeIso(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export default function MonitorPage() {
  const t = useI18n();
  const { confirm } = useFeedback();
  const { stores, loading: isStoreLoading, hasStore, refreshStores } = useStores();
  const [printJobs, setPrintJobs] = useState<AndroidOrder[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [historyDate, setHistoryDate] = useState(getTodayInputDate);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("active");
  const [showAmountBreakdown, setShowAmountBreakdown] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [reprintingJobId, setReprintingJobId] = useState("");
  const [deletingJobId, setDeletingJobId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [showManageMenu, setShowManageMenu] = useState(false);
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manageMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedStore = stores.find((store) => store.id === selectedStoreId) || null;
  const preferredStore = selectedStore || (!selectedStoreId ? stores[0] || null : null);
  const preferredStoreId = preferredStore?.id || "";

  useEffect(() => {
    if (!isStoreLoading && selectedStoreId && !stores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(stores[0]?.id || "");
      setPrintJobs([]);
      return;
    }

    if (isStoreLoading || stores.length === 0 || selectedStoreId) return;

    const storedStoreId = localStorage.getItem(monitorStoreStorageKey);
    const nextStoreId = storedStoreId && stores.some((store) => store.id === storedStoreId)
      ? storedStoreId
      : stores[0].id;
    setSelectedStoreId(nextStoreId);
  }, [isStoreLoading, selectedStoreId, stores]);

  useEffect(() => {
    if (selectedStoreId) {
      localStorage.setItem(monitorStoreStorageKey, selectedStoreId);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (!showManageMenu) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!manageMenuRef.current?.contains(event.target as Node)) {
        setShowManageMenu(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [showManageMenu]);

  const fetchPrintJobs = useCallback(async (options?: { force?: boolean; showLoading?: boolean }) => {
    if (!preferredStoreId) {
      setPrintJobs([]);
      return;
    }

    const range = getDateRangeIso(historyDate);
    const params = { storeId: preferredStoreId, ...range, deleted: historyTab === "deleted" };
    const cached = !options?.force ? getCachedPrintHistory(params) : null;
    if (cached) {
      setPrintJobs(cached);
      return;
    }

    const showLoading = options?.showLoading ?? true;
    if (showLoading) {
      setIsHistoryLoading(true);
    }

    try {
      setPrintJobs(await getPrintHistory({ ...params, force: options?.force }));
    } finally {
      if (showLoading) {
        setIsHistoryLoading(false);
      }
    }
  }, [historyDate, historyTab, preferredStoreId]);

  const verifyDefaultPrinterConnection = (defaultMac: string) => {
    setConnectionStatus("connecting");
    try {
      const success = window.AndroidBridge?.connectPrinter(defaultMac) ?? false;
      setConnectionStatus(success ? "success" : "ready");
      if (success) {
        window.AndroidBridge?.saveDefaultPrinter(defaultMac);
      }
    } catch (error) {
      console.error(error);
      setConnectionStatus("error");
    }
  };

  const scheduleDefaultPrinterVerification = (defaultMac: string) => {
    setConnectionStatus("ready");
    if (verifyTimerRef.current) {
      clearTimeout(verifyTimerRef.current);
    }
    verifyTimerRef.current = setTimeout(() => {
      verifyTimerRef.current = null;
      verifyDefaultPrinterConnection(defaultMac);
    }, 300);
  };

  const loadPrinters = () => {
    if (typeof window !== "undefined" && window.AndroidBridge) {
      try {
        if (!window.AndroidBridge.isBluetoothEnabled()) {
          setConnectionStatus("idle");
          return;
        }

        const parsed = JSON.parse(window.AndroidBridge.getPairedPrinters()) as AndroidPrinter[];
        const defaultMac = window.AndroidBridge.getDefaultPrinter();
        if (defaultMac && parsed.some((printer) => printer.mac === defaultMac)) {
          setSelectedPrinter(defaultMac);
          scheduleDefaultPrinterVerification(defaultMac);
        } else {
          setSelectedPrinter("");
          setConnectionStatus("idle");
        }
      } catch (error) {
        console.error(error);
        setConnectionStatus("error");
      }
    } else {
      setConnectionStatus("idle");
    }
  };

  const ensurePrinterConnected = () => {
    if (!selectedPrinter) {
      alert(t.monitor_connect_first_short);
      return false;
    }

    if (connectionStatus === "success") return true;

    setConnectionStatus("connecting");
    try {
      const success = window.AndroidBridge?.connectPrinter(selectedPrinter) ?? false;
      setConnectionStatus(success ? "success" : "failed");
      if (success) {
        window.AndroidBridge?.saveDefaultPrinter(selectedPrinter);
      } else {
        alert(t.monitor_connect_first_short);
      }
      return success;
    } catch {
      setConnectionStatus("error");
      alert(t.monitor_connect_first_short);
      return false;
    }
  };

  const reprintDeliveryOrder = async (job: AndroidOrder) => {
    if (reprintingJobId || deletingJobId) return;
    if (!(await confirm({
      title: "주문서 재출력",
      message: "정말 재출력하시겠습니까?",
      confirmText: "재출력",
      cancelText: "취소",
    }))) return;
    if (!ensurePrinterConnected()) return;
    setReprintingJobId(job.id);

    try {
      const order = parseDeliveryShareOrder(job.raw_text);
      if (!order) {
        alert(t.monitor_print_failed);
        return;
      }

      if (!window.AndroidBridge?.printBitmapDataUrl) {
        alert(t.monitor_web_reprint_update_required);
        return;
      }

      let orderSequence = getDeliveryPrintHistorySequence(job.parsed_data);
      if (!orderSequence) {
        orderSequence = await nextDailyOrderSequence(preferredStoreId);
      }
      const menuLanguageSettings = await getMenuLanguageSettings(preferredStoreId);
      const printableOrder = applyMenuLanguageRules(order, menuLanguageSettings);
      const success = window.AndroidBridge.printBitmapDataUrl(renderDeliveryShareReceipt(printableOrder))
        && window.AndroidBridge.printBitmapDataUrl(renderDeliveryKitchenOrder(printableOrder, { orderSequence }));
      if (!success) {
        alert(t.monitor_print_failed);
      }
    } catch (error) {
      console.error(error);
      alert(t.monitor_print_failed);
    } finally {
      setReprintingJobId("");
    }
  };

  const deleteDeliveryOrder = async (job: AndroidOrder) => {
    if (reprintingJobId || deletingJobId) return;
    if (!(await confirm({
      title: "출력 이력 삭제",
      message: "정말 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      danger: true,
    }))) return;

    setDeletingJobId(job.id);
    try {
      const success = await deletePrintHistory(job.id, preferredStoreId);
      if (!success) {
        alert("삭제에 실패했습니다.");
        return;
      }
      setPrintJobs((current) => current.filter((item) => item.id !== job.id));
    } finally {
      setDeletingJobId("");
    }
  };

  useEffect(() => {
    const handleFocus = () => loadPrinters();

    if (isStoreLoading || !hasStore) return undefined;

    loadPrinters();
    window.addEventListener("focus", handleFocus);

    return () => {
      if (verifyTimerRef.current) {
        clearTimeout(verifyTimerRef.current);
        verifyTimerRef.current = null;
      }
      window.removeEventListener("focus", handleFocus);
    };
  }, [hasStore, isStoreLoading]);

  useEffect(() => {
    if (isStoreLoading || !hasStore) return;
    void fetchPrintJobs();
  }, [fetchPrintJobs, hasStore, isStoreLoading]);

  const { refreshing } = usePullToRefresh({
    disabled: isStoreLoading || !hasStore,
    onRefresh: async () => {
      await refreshStores({ force: true });
      await fetchPrintJobs({ force: true, showLoading: false });
    },
  });

  if (isStoreLoading) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;
  }

  if (!hasStore) {
    return <StoreRequiredNotice />;
  }

  if (!preferredStoreId) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;
  }

  const amountBreakdown = printJobs.reduce((sum, job) => {
    const detail = getDeliveryPrintHistoryDetail(job.parsed_data);
    const amount = detail.totalAmount ?? 0;
    const method = detail.paymentMethod;

    if (method === "CASH") sum.cash += amount;
    else if (method === "BANKING") sum.banking += amount;
    else if (method === "CARD") sum.card += amount;
    else sum.other += amount;

    sum.total += amount;
    return sum;
  }, { cash: 0, banking: 0, card: 0, other: 0, total: 0 });

  return (
    <main className="bg-gray-50 min-h-screen">
      <PageHeader
        title={t.mypage_monitor}
        subtitle={preferredStore?.name || ""}
        icon={<Printer className="w-5 h-5" />}
        maxWidth="max-w-6xl"
        actions={(
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${connectionStatus === "success" ? "text-blue-600" : "text-gray-500"}`}>
              {connectionStatus === "success" ? "연결됨" : "연결안됨"}
            </span>
            <Link
              href="/store/monitor/printer"
              className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors ${
                connectionStatus === "success"
                  ? "border-blue-100 bg-blue-50 text-blue-600"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
              title={t.mypage_printer}
            >
              {connectionStatus === "success" ? <BluetoothConnected className="w-5 h-5" /> : <Bluetooth className="w-5 h-5" />}
            </Link>
            <div ref={manageMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowManageMenu((current) => !current)}
                className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 transition-colors hover:bg-gray-100"
                title="관리 메뉴"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showManageMenu && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
                  {stores.length > 1 && (
                    <div className="border-b border-gray-100 p-2">
                      <label className="mb-1 block text-[11px] font-black text-gray-500">상점 선택</label>
                      <select
                        value={preferredStoreId}
                        onChange={(event) => {
                          setSelectedStoreId(event.target.value);
                          setPrintJobs([]);
                          setShowManageMenu(false);
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-bold"
                      >
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      />

      <div className="max-w-6xl mx-auto p-5">
      {connectionStatus !== "success" && (
        <p className="mb-4 text-xs font-semibold text-gray-500">
          우측 상단 아이콘을 이용하여 블루투스 프린터를 연결해주세요
        </p>
      )}

      {refreshing && (
        <div className="mb-4 rounded-xl bg-blue-50 px-4 py-2 text-center text-xs font-bold text-blue-600">
          {t.monitor_print_history_refreshing}
        </div>
      )}

      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="shrink-0 text-lg font-bold text-gray-800 whitespace-nowrap">{t.monitor_print_history_title}</h2>
          <label className="ml-auto flex min-w-0 shrink items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value || getTodayInputDate())}
              className="min-w-0 bg-transparent text-right outline-none"
            />
          </label>
        </div>
        <div className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50 shadow-sm">
          <button
            type="button"
            onClick={() => setShowAmountBreakdown((current) => !current)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-black text-blue-950"
          >
            <span>합산금액 {amountBreakdown.total.toLocaleString()} ₫</span>
            {showAmountBreakdown ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </button>
          {showAmountBreakdown && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-blue-100 bg-white px-3 py-2 text-xs font-bold text-gray-700">
              <span>현금 {amountBreakdown.cash.toLocaleString()} ₫</span>
              <span>계좌이체 {amountBreakdown.banking.toLocaleString()} ₫</span>
              <span>카드 {amountBreakdown.card.toLocaleString()} ₫</span>
              {amountBreakdown.other > 0 ? <span>기타 {amountBreakdown.other.toLocaleString()} ₫</span> : null}
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-[7fr_3fr] rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setHistoryTab("active")}
          className={`rounded-lg px-3 py-2 text-sm font-black transition ${
            historyTab === "active" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          출력 이력
        </button>
        <button
          type="button"
          onClick={() => setHistoryTab("deleted")}
          className={`rounded-lg px-3 py-2 text-sm font-black transition ${
            historyTab === "deleted" ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          휴지통
        </button>
      </div>

      {isHistoryLoading && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          <span>가져오는 중입니다.</span>
        </div>
      )}

      <div className="space-y-4">
        {printJobs.length === 0 ? (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 mb-2">{t.monitor_print_history_empty}</p>
          </div>
        ) : (
          printJobs.map((order) => (
            <div key={order.id} className={`p-4 bg-white shadow-md rounded-xl border-l-4 ${order.status === "PRINTED" ? "border-green-500" : "border-red-500"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-400">
                  {historyTab === "deleted" && order.deleted_at ? `삭제 ${order.deleted_at}` : order.timestamp}
                </span>
                <div className="flex gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {getDeliveryPrintHistorySequence(order.parsed_data) ?? "-"}
                  </span>
                  <button
                    disabled={Boolean(reprintingJobId || deletingJobId)}
                    onClick={() => void reprintDeliveryOrder(order)}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 bg-blue-500 text-white rounded shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reprintingJobId === order.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
                    {t.monitor_reprint}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(reprintingJobId || deletingJobId)}
                    onClick={() => void deleteDeliveryOrder(order)}
                    hidden={historyTab === "deleted"}
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title="삭제"
                  >
                    {deletingJobId === order.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <X className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {order.parsed_data ? <p className="text-sm font-semibold text-gray-700 mb-2">{getDeliveryPrintHistorySummary(order.parsed_data)}</p> : null}
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 bg-gray-50 p-3 rounded-lg">{order.raw_text}</pre>
            </div>
          ))
        )}
      </div>
      </div>
    </main>
  );
}

