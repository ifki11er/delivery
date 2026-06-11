"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bluetooth, BluetoothConnected, CalendarDays, Hash, LoaderCircle, MoreVertical, Printer } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { StoreRequiredNotice } from "@/components/store/StoreRequiredNotice";
import { useStores } from "@/components/providers/StoreProvider";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PageHeader from "@/components/layout/PageHeader";
import { getCachedPrintHistory, getPrintHistory } from "@/lib/print-history";
import {
  getDeliveryPrintHistorySequence,
  getDeliveryPrintHistorySummary,
  parseDeliveryShareOrder,
  renderDeliveryKitchenOrder,
  renderDeliveryShareReceipt,
} from "@/lib/delivery-share";
import { nextDailyOrderSequence } from "@/lib/daily-order-sequence";
import { applyMenuLanguageRules, getMenuLanguageSettings } from "@/lib/menu-language";

type ConnectionStatus = "idle" | "ready" | "connecting" | "success" | "failed" | "error";
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
  const { stores, loading: isStoreLoading, hasStore, refreshStores } = useStores();
  const [printJobs, setPrintJobs] = useState<AndroidOrder[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [historyDate, setHistoryDate] = useState(getTodayInputDate);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
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
    const params = { storeId: preferredStoreId, ...range };
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
  }, [historyDate, preferredStoreId]);

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
    if (!ensurePrinterConnected()) return;

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
      try {
        orderSequence = await nextDailyOrderSequence(preferredStoreId);
      } catch (error) {
        console.error(error);
        alert(t.monitor_print_failed);
        return;
      }
    }
    const menuLanguageSettings = await getMenuLanguageSettings(preferredStoreId);
    const printableOrder = applyMenuLanguageRules(order, menuLanguageSettings);
    const success = window.AndroidBridge.printBitmapDataUrl(renderDeliveryShareReceipt(printableOrder, { orderSequence }))
      && window.AndroidBridge.printBitmapDataUrl(renderDeliveryKitchenOrder(printableOrder, { orderSequence }));
    if (!success) {
      alert(t.monitor_print_failed);
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

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap">{t.monitor_print_history_title}</h2>
        <label className="ml-auto flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={historyDate}
            onChange={(event) => setHistoryDate(event.target.value || getTodayInputDate())}
            className="bg-transparent outline-none"
          />
        </label>
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
          printJobs.map((order, index) => (
            <div key={index} className={`p-4 bg-white shadow-md rounded-xl border-l-4 ${order.status === "PRINTED" ? "border-green-500" : "border-red-500"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-400">{order.timestamp}</span>
                <div className="flex gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {getDeliveryPrintHistorySequence(order.parsed_data) ?? "-"}
                  </span>
                  <button
                    onClick={() => void reprintDeliveryOrder(order)}
                    className="text-xs font-bold px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition"
                  >
                    {t.monitor_reprint}
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

