"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = () => {
    if (typeof window !== "undefined" && (window as any).AndroidBridge) {
      try {
        const data = (window as any).AndroidBridge.getOrders();
        setOrders(JSON.parse(data));
      } catch (e) {
        console.error(e);
      }
    } else {
      console.log("AndroidBridge not found. (Not running inside Android App)");
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 2000); // 2초마다 자동 새로고침
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="p-5 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-extrabold mb-2 text-blue-600 tracking-tight">배달 주문 모니터</h1>
      <p className="text-sm text-gray-500 mb-6">백그라운드에서 알림을 감지하면 이곳에 나타납니다.</p>
      
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
                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{order.status}</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 bg-gray-50 p-3 rounded-lg">{order.raw_text}</pre>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
