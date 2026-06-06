"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bluetooth, ChevronLeft, Printer, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StoreRequiredNotice } from "@/components/store/StoreRequiredNotice";

type ConnectionStatus = "idle" | "ready" | "connecting" | "success" | "failed" | "error";

export default function MonitorPage() {
  const router = useRouter();
  const t = useI18n();
  const [printJobs, setPrintJobs] = useState<AndroidOrder[]>([]);
  const [printers, setPrinters] = useState<AndroidPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [showToast, setShowToast] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const [hasStore, setHasStore] = useState(false);

  const connectionStatusText = {
    idle: t.monitor_printer_idle,
    ready: t.monitor_printer_ready,
    connecting: t.monitor_printer_connecting,
    success: t.monitor_printer_connected,
    failed: t.monitor_printer_failed,
    error: t.monitor_printer_error,
  }[connectionStatus];

  const fetchPrintJobs = () => {
    if (typeof window !== "undefined" && window.AndroidBridge) {
      try {
        const data = window.AndroidBridge.getOrders();
        setPrintJobs(JSON.parse(data) as AndroidOrder[]);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const loadPrinters = () => {
    if (typeof window !== "undefined" && window.AndroidBridge) {
      try {
        if (!window.AndroidBridge.isBluetoothEnabled()) {
          alert(t.monitor_bluetooth_disabled);
          setPrinters([]);
          setConnectionStatus("idle");
          return;
        }

        const parsed = JSON.parse(window.AndroidBridge.getPairedPrinters()) as AndroidPrinter[];
        setPrinters(parsed);

        const defaultMac = window.AndroidBridge.getDefaultPrinter();
        if (defaultMac && parsed.some((printer) => printer.mac === defaultMac)) {
          setSelectedPrinter(defaultMac);
          setConnectionStatus("ready");
        } else if (parsed.length > 0 && !selectedPrinter) {
          setSelectedPrinter(parsed[0].mac);
          setConnectionStatus("ready");
        } else if (parsed.length === 0) {
          setConnectionStatus("idle");
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleManualRefresh = () => {
    loadPrinters();
    fetchPrintJobs();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const connectToPrinter = () => {
    if (!selectedPrinter || isConnecting) return;

    setConnectionStatus("connecting");
    setIsConnecting(true);

    setTimeout(() => {
      try {
        const success = window.AndroidBridge?.connectPrinter(selectedPrinter) ?? false;
        setConnectionStatus(success ? "success" : "failed");
        if (success) {
          window.AndroidBridge?.saveDefaultPrinter(selectedPrinter);
        }
      } catch {
        setConnectionStatus("error");
      } finally {
        setIsConnecting(false);
      }
    }, 100);
  };

  const testPrint = () => {
    if (!ensurePrinterConnected()) return;
    const success = window.AndroidBridge?.printTest() ?? false;
    if (!success) alert(t.monitor_test_print_failed);
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

  const printOrder = (text: string) => {
    if (!ensurePrinterConnected()) return;

    const receiptText = `\n================================\n           ${t.monitor_receipt_title}\n================================\n\n${text}\n\n`;
    const success = window.AndroidBridge?.printText(receiptText) ?? false;
    if (!success) {
      alert(t.monitor_print_failed);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    const handleFocus = () => loadPrinters();

    const initialize = async () => {
      try {
        const res = await fetch("/api/store");
        if (!res.ok) {
          if (isMounted) setHasStore(false);
          return;
        }

        const stores = (await res.json()) as unknown[];
        if (!isMounted) return;

        const nextHasStore = stores.length > 0;
        setHasStore(nextHasStore);
        if (nextHasStore) {
          fetchPrintJobs();
          loadPrinters();
          interval = setInterval(fetchPrintJobs, 2000);
          window.addEventListener("focus", handleFocus);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) setHasStore(false);
      } finally {
        if (isMounted) setIsStoreLoading(false);
      }
    };

    void initialize();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  if (isStoreLoading) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;
  }

  if (!hasStore) {
    return <StoreRequiredNotice />;
  }

  return (
    <main className="p-5 bg-gray-50 min-h-screen">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-extrabold text-blue-600 tracking-tight">{t.mypage_monitor}</h1>
      </div>

      <Panel className="mb-6 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap">{t.mypage_printer}</h2>
            {showToast && (
              <span className="text-xs font-semibold text-green-600 animate-pulse whitespace-nowrap">
                {t.monitor_refreshed}
              </span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => window.AndroidBridge?.openBluetoothSettings()}
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <Bluetooth className="w-3.5 h-3.5 inline-block mr-1" />
              {t.monitor_pairing}
            </Button>
            <Button
              onClick={handleManualRefresh}
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="w-3.5 h-3.5 inline-block mr-1" />
              {t.monitor_refresh}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <select
            className="p-2 border rounded text-sm text-black disabled:bg-gray-100 disabled:text-gray-400"
            value={selectedPrinter}
            onChange={(event) => {
              setSelectedPrinter(event.target.value);
              setConnectionStatus(event.target.value ? "ready" : "idle");
            }}
            disabled={isConnecting}
          >
            {printers.length === 0 ? <option>{t.monitor_no_bluetooth_devices}</option> : null}
            {printers.map((printer) => (
              <option key={printer.mac} value={printer.mac}>
                {printer.name} ({printer.mac})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button
              onClick={connectToPrinter}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? t.monitor_printer_connecting : t.monitor_connect_printer}
            </Button>
            <Button
              onClick={testPrint}
              disabled={isConnecting}
              variant="success"
              className="flex-1"
            >
              {t.monitor_test_print}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-1">
            {t.monitor_status_label}: <span className="font-medium text-gray-700">{connectionStatusText}</span>
          </p>
        </div>
      </Panel>

      <h2 className="text-lg font-bold mb-3 text-gray-800">출력 이력</h2>
      <div className="space-y-4">
        {printJobs.length === 0 ? (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 mb-2">아직 출력한 주문이 없습니다.</p>
          </div>
        ) : (
          printJobs.map((order, index) => (
            <div key={index} className={`p-4 bg-white shadow-md rounded-xl border-l-4 ${order.status === "PRINTED" ? "border-green-500" : "border-red-500"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-400">{order.timestamp}</span>
                <div className="flex gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${order.status === "PRINTED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {order.status === "PRINTED" ? "출력 완료" : "출력 실패"}
                  </span>
                  <button
                    onClick={() => printOrder(order.raw_text)}
                    className="text-xs font-bold px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition"
                  >
                    재출력
                  </button>
                </div>
              </div>
              {order.parsed_data ? <p className="text-sm font-semibold text-gray-700 mb-2">{order.parsed_data}</p> : null}
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 bg-gray-50 p-3 rounded-lg">{order.raw_text}</pre>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
