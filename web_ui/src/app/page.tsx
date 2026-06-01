"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<string>("대기중");
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const fetchOrders = () => {
    if (typeof window !== "undefined" && (window as any).AndroidBridge) {
      try {
        const data = (window as any).AndroidBridge.getOrders();
        setOrders(JSON.parse(data));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const loadPrinters = () => {
    if (typeof window !== "undefined" && (window as any).AndroidBridge) {
      try {
        const isEnabled = (window as any).AndroidBridge.isBluetoothEnabled();
        if (!isEnabled) {
          alert("스마트폰의 블루투스 기능이 꺼져 있습니다. 블루투스를 켜고 다시 시도해주세요!");
          setPrinters([]);
          return;
        }

        const data = (window as any).AndroidBridge.getPairedPrinters();
        const parsed = JSON.parse(data);
        setPrinters(parsed);
        if (parsed.length > 0 && !selectedPrinter) {
            setSelectedPrinter(parsed[0].mac);
        }
      } catch (e) {
        console.error(e);
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
    
    setConnectionStatus("연결 중... ⏳");
    setIsConnecting(true);

    // UI가 '연결 중' 상태로 먼저 렌더링될 수 있도록 약간의 지연(setTimeout)을 줍니다.
    // 안드로이드 블루투스 연결 함수는 동기적이라서 화면을 멈추게 만들 수 있기 때문입니다.
    setTimeout(() => {
      try {
        const success = (window as any).AndroidBridge.connectPrinter(selectedPrinter);
        setConnectionStatus(success ? "연결 성공! 🖨️" : "연결 실패 ❌");
      } catch (error) {
        setConnectionStatus("연결 실패 ❌ (에러)");
      } finally {
        setIsConnecting(false);
      }
    }, 100);
  };

  const testPrint = () => {
    const success = (window as any).AndroidBridge.printTest();
    if (!success) alert("인쇄 실패. 프린터가 연결되어 있는지 확인해주세요.");
  };

  const printOrder = (text: string) => {
    if (!selectedPrinter || connectionStatus.indexOf("성공") === -1) {
      alert("먼저 프린터를 연결해주세요.");
      return;
    }
    // 인쇄될 기본 템플릿
    const receiptText = `\n================================\n           주 문 서\n================================\n\n${text}\n\n`;
    const success = (window as any).AndroidBridge.printText(receiptText);
    if (!success) {
      alert("인쇄에 실패했습니다. 프린터 연결 상태를 확인해주세요.");
    }
  };

  useEffect(() => {
    fetchOrders();
    loadPrinters();
    const interval = setInterval(fetchOrders, 2000);
    
    // 사용자가 블루투스 설정 창에서 돌아왔을 때(화면 포커스 시) 자동으로 목록 새로고침
    const handleFocus = () => {
      loadPrinters();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <main className="p-5 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-extrabold mb-2 text-blue-600 tracking-tight">배달 주문 모니터</h1>
      <p className="text-sm text-gray-500 mb-6">백그라운드에서 알림을 감지하면 이곳에 나타납니다.</p>

      {/* 블루투스 프린터 테스트 섹션 */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">🖨️ 블루투스 프린터</h2>
            {showToast && <span className="text-xs font-semibold text-green-600 animate-pulse">✓ 목록 갱신됨</span>}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).AndroidBridge) {
                  (window as any).AndroidBridge.openBluetoothSettings();
                }
              }} 
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
            >
              + 기기 페어링
            </button>
            <button onClick={handleManualRefresh} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors">
              🔄 새로고침
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <select 
            className="p-2 border rounded text-sm text-black disabled:bg-gray-100 disabled:text-gray-400"
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            disabled={isConnecting}
          >
            {printers.length === 0 ? <option>페어링된 블루투스 기기 없음</option> : null}
            {printers.map(p => (
              <option key={p.mac} value={p.mac}>{p.name} ({p.mac})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button 
              onClick={connectToPrinter} 
              disabled={isConnecting}
              className={`flex-1 py-2 rounded text-sm font-semibold transition ${isConnecting ? 'bg-indigo-300 text-indigo-50 cursor-wait' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
            >
              {isConnecting ? '연결 중...' : '프린터 연결'}
            </button>
            <button 
              onClick={testPrint} 
              disabled={isConnecting}
              className={`flex-1 py-2 rounded text-sm font-semibold transition ${isConnecting ? 'bg-green-300 text-green-50 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              테스트 영수증 출력
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-1">상태: <span className="font-medium text-gray-700">{connectionStatus}</span></p>
        </div>
      </div>
      
      <h2 className="text-lg font-bold mb-3 text-gray-800">📋 수신된 알림 목록</h2>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 mb-2">아직 수신된 알림이 없습니다.</p>
            <p className="text-xs text-blue-500 font-semibold">💡 카카오톡 '나에게 보내기'로<br/>"배달 주문 들어왔어" 라고 메시지를 보내보세요!</p>
          </div>
        ) : (
          orders.map((order, i) => (
            <div key={i} className="p-4 bg-white shadow-md rounded-xl border-l-4 border-blue-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-400">{order.timestamp}</span>
                <div className="flex gap-2">
                  <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{order.status}</span>
                  <button 
                    onClick={() => printOrder(order.raw_text)}
                    className="text-xs font-bold px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition"
                  >
                    🖨️ 인쇄
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
