"use client";

import { useEffect, useState } from "react";
import { Bluetooth, Printer, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StoreRequiredNotice } from "@/components/store/StoreRequiredNotice";
import { useStores } from "@/components/providers/StoreProvider";
import PageHeader from "@/components/layout/PageHeader";

type ConnectionStatus = "idle" | "ready" | "connecting" | "success" | "failed" | "error";

function renderPrinterTestImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 576;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("WorkLink Print Test", 288, 88);
  ctx.font = "400 28px Arial, sans-serif";
  ctx.fillText("HPRT TP80N-M", 288, 150);
  ctx.fillText("Connection Success", 288, 198);
  ctx.beginPath();
  ctx.moveTo(54, 240);
  ctx.lineTo(522, 240);
  ctx.stroke();
  ctx.font = "400 22px Arial, sans-serif";
  ctx.fillText(new Date().toLocaleString("ko-KR"), 288, 292);

  return canvas.toDataURL("image/png");
}

export default function PrinterSettingsPage() {
  const t = useI18n();
  const { loading: isStoreLoading, hasStore } = useStores();
  const [printers, setPrinters] = useState<AndroidPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [showToast, setShowToast] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectionStatusText = {
    idle: t.monitor_printer_idle,
    ready: t.monitor_printer_ready,
    connecting: t.monitor_printer_connecting,
    success: t.monitor_printer_connected,
    failed: t.monitor_printer_failed,
    error: t.monitor_printer_error,
  }[connectionStatus];

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
        setConnectionStatus("error");
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
    if (connectionStatus !== "success") {
      alert(t.monitor_connect_first_short);
      return;
    }

    if (!window.AndroidBridge?.printBitmapDataUrl) {
      alert(t.monitor_web_test_update_required);
      return;
    }

    const success = window.AndroidBridge.printBitmapDataUrl(renderPrinterTestImage());
    if (!success) alert(t.monitor_test_print_failed);
  };

  useEffect(() => {
    if (isStoreLoading || !hasStore) return;
    loadPrinters();
  }, [hasStore, isStoreLoading]);

  if (isStoreLoading) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;
  }

  if (!hasStore) {
    return <StoreRequiredNotice />;
  }

  return (
    <main className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={t.mypage_printer}
        icon={<Bluetooth className="w-5 h-5 text-blue-600" />}
      />

      <div className="max-w-2xl mx-auto p-5">
        <Panel className="p-4">
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
      </div>
    </main>
  );
}
