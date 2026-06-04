"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bluetooth, ChevronLeft, Printer, RefreshCw, Wifi } from "lucide-react";
import { useI18n, useLocale } from "@/i18n/I18nProvider";

type ConnectionStatus = "idle" | "connecting" | "success" | "failed" | "error";

export default function MonitorPage() {
  const router = useRouter();
  const t = useI18n();
  const locale = useLocale();
  const [orders, setOrders] = useState<AndroidOrder[]>([]);
  const [printers, setPrinters] = useState<AndroidPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [showToast, setShowToast] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [wifiIp, setWifiIp] = useState("");
  const [ipLastUpdated, setIpLastUpdated] = useState("");

  const connectionStatusText = {
    idle: t.monitor_printer_idle,
    connecting: t.monitor_printer_connecting,
    success: t.monitor_printer_connected,
    failed: t.monitor_printer_failed,
    error: t.monitor_printer_error,
  }[connectionStatus];

  const updateWifiIp = async (manual = false) => {
    try {
      const res = await fetch("/api/store/wifi-ip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update IP");

      const currentIp = data.wifiIpAddress;
      setWifiIp(currentIp);
      setIpLastUpdated(new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }));

      if (manual) {
        alert(t.monitor_ip_updated.replace("{ip}", currentIp));
      }
    } catch {
      if (manual) alert(t.monitor_ip_update_failed);
    }
  };

  const fetchOrders = () => {
    if (typeof window !== "undefined" && window.AndroidBridge) {
      try {
        const data = window.AndroidBridge.getOrders();
        setOrders(JSON.parse(data) as AndroidOrder[]);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const loadPrinters = () => {
    if (typeof window !== "undefined" && window.AndroidBridge) {
      try {
        setAutoPrint(window.AndroidBridge.isAutoPrintEnabled());

        if (!window.AndroidBridge.isBluetoothEnabled()) {
          alert(t.monitor_bluetooth_disabled);
          setPrinters([]);
          return;
        }

        const parsed = JSON.parse(window.AndroidBridge.getPairedPrinters()) as AndroidPrinter[];
        setPrinters(parsed);

        const defaultMac = window.AndroidBridge.getDefaultPrinter();
        if (defaultMac && parsed.some((printer) => printer.mac === defaultMac)) {
          setSelectedPrinter(defaultMac);
        } else if (parsed.length > 0 && !selectedPrinter) {
          setSelectedPrinter(parsed[0].mac);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleManualRefresh = () => {
    loadPrinters();
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
    const success = window.AndroidBridge?.printTest() ?? false;
    if (!success) alert(t.monitor_test_print_failed);
  };

  const toggleAutoPrint = () => {
    const newState = !autoPrint;

    if (newState && connectionStatus !== "success") {
      alert(t.monitor_connect_first);
      return;
    }

    window.AndroidBridge?.setAutoPrintEnabled(newState);
    if (newState) {
      alert(t.monitor_auto_print_enabled);
    }
    setAutoPrint(newState);
  };

  const printOrder = (text: string) => {
    if (!selectedPrinter || connectionStatus !== "success") {
      alert(t.monitor_connect_first_short);
      return;
    }

    const receiptText = `\n================================\n           ${t.monitor_receipt_title}\n================================\n\n${text}\n\n`;
    const success = window.AndroidBridge?.printText(receiptText) ?? false;
    if (!success) {
      alert(t.monitor_print_failed);
    }
  };

  useEffect(() => {
    fetchOrders();
    loadPrinters();
    void updateWifiIp();

    const interval = setInterval(fetchOrders, 2000);
    const ipInterval = setInterval(() => void updateWifiIp(), 60 * 60 * 1000);
    const handleFocus = () => loadPrinters();

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      clearInterval(ipInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <main className="p-5 bg-gray-50 min-h-screen">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-extrabold text-blue-600 tracking-tight">{t.mypage_monitor}</h1>
      </div>

      <div className="mb-6 p-4 bg-indigo-50 rounded-xl flex items-center justify-between border border-indigo-100 shadow-sm">
        <div className="flex items-center text-indigo-700">
          <Wifi className="w-6 h-6 mr-3" />
          <div>
            <span className="font-bold text-sm block">{t.monitor_bot_active}</span>
            <span className="text-xs opacity-80 mt-0.5 block">
              {t.monitor_ip_label}: {wifiIp || t.mypage_loading} ({t.monitor_bot_last} {ipLastUpdated || "-"})
            </span>
          </div>
        </div>
        <button
          onClick={() => void updateWifiIp(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors"
        >
          {t.monitor_bot_manual}
        </button>
      </div>

      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
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
            <button
              onClick={() => window.AndroidBridge?.openBluetoothSettings()}
              className="flex-1 sm:flex-none text-xs bg-blue-100 text-blue-700 px-2 py-2 rounded hover:bg-blue-200 whitespace-nowrap text-center font-medium"
            >
              <Bluetooth className="w-3.5 h-3.5 inline-block mr-1" />
              {t.monitor_pairing}
            </button>
            <button
              onClick={handleManualRefresh}
              className="flex-1 sm:flex-none text-xs bg-gray-200 text-gray-700 px-2 py-2 rounded hover:bg-gray-300 transition-colors whitespace-nowrap text-center font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 inline-block mr-1" />
              {t.monitor_refresh}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <select
            className="p-2 border rounded text-sm text-black disabled:bg-gray-100 disabled:text-gray-400"
            value={selectedPrinter}
            onChange={(event) => setSelectedPrinter(event.target.value)}
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
            <button
              onClick={connectToPrinter}
              disabled={isConnecting}
              className={`flex-1 py-2 rounded text-sm font-semibold transition ${
                isConnecting ? "bg-indigo-300 text-indigo-50 cursor-wait" : "bg-indigo-500 text-white hover:bg-indigo-600"
              }`}
            >
              {isConnecting ? t.monitor_printer_connecting : t.monitor_connect_printer}
            </button>
            <button
              onClick={testPrint}
              disabled={isConnecting}
              className={`flex-1 py-2 rounded text-sm font-semibold transition ${
                isConnecting ? "bg-green-300 text-green-50 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {t.monitor_test_print}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-bold text-gray-800">{t.monitor_auto_print}</p>
            <button
              onClick={toggleAutoPrint}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPrint ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPrint ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-1">
            {t.monitor_status_label}: <span className="font-medium text-gray-700">{connectionStatusText}</span>
          </p>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-3 text-gray-800">{t.monitor_orders_title}</h2>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 mb-2">{t.monitor_orders_empty}</p>
          </div>
        ) : (
          orders.map((order, index) => (
            <div key={index} className="p-4 bg-white shadow-md rounded-xl border-l-4 border-blue-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-400">{order.timestamp}</span>
                <div className="flex gap-2">
                  <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{order.status}</span>
                  <button
                    onClick={() => printOrder(order.raw_text)}
                    className="text-xs font-bold px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition"
                  >
                    {t.monitor_print}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 bg-gray-50 p-3 rounded-lg">{order.raw_text}</pre>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
