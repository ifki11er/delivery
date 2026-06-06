'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Edit3,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Settings,
  Table2,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';

type PosTable = {
  id: string;
  name: string;
  status: 'EMPTY' | 'OCCUPIED' | string;
};

type PosMenu = {
  id: string;
  category_id: string;
  menu_code: string;
  name: string;
  price: number;
  is_active: boolean;
};

type PosCategory = {
  id: string;
  name: string;
  menus: PosMenu[];
};

type PosOrderItem = {
  id: string;
  order_id: string;
  menu_id: string | null;
  menu_code: string;
  name: string;
  price: number;
  quantity: number;
  item_type: string;
};

type PosOrder = {
  id: string;
  table_id: string;
  status: string;
  note: string | null;
  payment_method: string | null;
  order_sequence?: number;
  total: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  items: PosOrderItem[];
};

type PosPayload = {
  store: {
    id: string;
    name: string;
    currency: string;
    businessRegNo?: string | null;
    address?: string | null;
    representativeName?: string | null;
    contact?: string | null;
  };
  tables: PosTable[];
  categories: PosCategory[];
  orders: PosOrder[];
  history: PosOrder[];
};

type TabKey = 'order' | 'tables' | 'menus' | 'history';
type DraftOrders = Record<string, PosOrder>;

const currency = '₫';
const draftStoragePrefix = 'mini_receipt_drafts_v1';
const sequenceStoragePrefix = 'mini_receipt_daily_sequence_v1';

function formatMoney(amount: number) {
  return `${amount.toLocaleString()} ${currency}`;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function printStyledText(text: string, fontSize: number, bold: boolean) {
  if (window.AndroidBridge?.printTextWithStyle) {
    return window.AndroidBridge.printTextWithStyle(text, fontSize, bold);
  }

  return window.AndroidBridge?.printText(text) ?? false;
}

function formatKitchenPrintedAt() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}:${second}`;
}

function formatReceiptPrintedAt() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function getTodayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
}

export default function MiniReceiptPage() {
  const router = useRouter();
  const t = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<PosPayload | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('order');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [tableName, setTableName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [menuCode, setMenuCode] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [menuCategoryId, setMenuCategoryId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('현금');
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
  const [draftOrders, setDraftOrders] = useState<DraftOrders>({});
  const [expandedHistoryId, setExpandedHistoryId] = useState('');
  const [historyDate, setHistoryDate] = useState(getTodayInputDate);

  const loadData = async (nextHistoryDate = historyDate) => {
    try {
      const params = new URLSearchParams({ historyDate: nextHistoryDate });
      const res = await fetch(`/api/store/mini-receipt?${params.toString()}`);
      if (!res.ok) {
        setPayload(null);
        return;
      }

      const data = (await res.json()) as PosPayload;
      setPayload(data);

      const nextTableId = data.tables.some((table) => table.id === selectedTableId)
        ? selectedTableId
        : data.tables[0]?.id || '';
      const nextCategoryId = data.categories.some((category) => category.id === selectedCategoryId)
        ? selectedCategoryId
        : data.categories[0]?.id || '';
      setSelectedTableId(nextTableId);
      setSelectedCategoryId(nextCategoryId);
      setMenuCategoryId((current) => (
        data.categories.some((category) => category.id === current) ? current : nextCategoryId
      ));
      const stored = localStorage.getItem(`${draftStoragePrefix}_${data.store.id}`);
      setDraftOrders(stored ? JSON.parse(stored) as DraftOrders : {});
    } catch (error) {
      console.error(error);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!payload?.store.id) return;
    localStorage.setItem(`${draftStoragePrefix}_${payload.store.id}`, JSON.stringify(draftOrders));
  }, [draftOrders, payload?.store.id]);

  const postAction = async (body: Record<string, unknown>) => {
    if (!payload?.store.id || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/store/mini-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: payload.store.id, historyDate, ...body }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || '처리에 실패했습니다.');
        return;
      }

      const data = (await res.json()) as PosPayload;
      setPayload(data);
      setSelectedTableId((current) => (
        data.tables.some((table) => table.id === current) ? current : data.tables[0]?.id || ''
      ));
      setSelectedCategoryId((current) => (
        data.categories.some((category) => category.id === current) ? current : data.categories[0]?.id || ''
      ));
      setMenuCategoryId((current) => (
        data.categories.some((category) => category.id === current) ? current : data.categories[0]?.id || ''
      ));
    } catch (error) {
      console.error(error);
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedTable = payload?.tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedCategory = payload?.categories.find((category) => category.id === selectedCategoryId) ?? null;
  const currentOrder = draftOrders[selectedTableId] ?? null;

  useEffect(() => {
    setOrderNote(currentOrder?.note || '');
  }, [currentOrder?.id, currentOrder?.note]);

  const total = useMemo(() => {
    return currentOrder?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
  }, [currentOrder]);

  const createDraftOrder = (tableId: string): PosOrder => ({
    id: `draft_${tableId}`,
    table_id: tableId,
    status: 'OPEN',
    note: '',
    payment_method: null,
    total: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: null,
    items: [],
  });

  const updateDraftOrder = (tableId: string, updater: (order: PosOrder) => PosOrder) => {
    setDraftOrders((current) => {
      const base = current[tableId] ?? createDraftOrder(tableId);
      const nextOrder = updater(base);
      const nextTotal = nextOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (nextOrder.items.length === 0) {
        const rest = { ...current };
        delete rest[tableId];
        return rest;
      }

      return {
        ...current,
        [tableId]: {
          ...nextOrder,
          total: nextTotal,
          updated_at: new Date().toISOString(),
        },
      };
    });
  };

  const addMenuToDraft = (menu: PosMenu) => {
    if (!selectedTableId) return;

    updateDraftOrder(selectedTableId, (order) => {
      const existing = order.items.find((item) => item.menu_id === menu.id);
      if (existing) {
        return {
          ...order,
          items: order.items.map((item) => (
            item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
          )),
        };
      }

      return {
        ...order,
        items: [
          ...order.items,
          {
            id: `draft_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            order_id: order.id,
            menu_id: menu.id,
            menu_code: menu.menu_code,
            name: menu.name,
            price: menu.price,
            quantity: 1,
            item_type: 'MENU',
          },
        ],
      };
    });
  };

  const addCustomItemToDraft = (name: string, price: number, itemType: string) => {
    if (!selectedTableId || !name.trim()) return;

    updateDraftOrder(selectedTableId, (order) => ({
      ...order,
      items: [
        ...order.items,
        {
          id: `draft_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          order_id: order.id,
          menu_id: null,
          menu_code: '',
          name: name.trim(),
          price,
          quantity: 1,
          item_type: itemType,
        },
      ],
    }));
  };

  const updateDraftItemQuantity = (itemId: string, quantity: number) => {
    if (!selectedTableId) return;

    updateDraftOrder(selectedTableId, (order) => ({
      ...order,
      items: quantity <= 0
        ? order.items.filter((item) => item.id !== itemId)
        : order.items.map((item) => item.id === itemId ? { ...item, quantity } : item),
    }));
  };

  const updateDraftNote = (note: string) => {
    if (!selectedTableId) return;
    updateDraftOrder(selectedTableId, (order) => ({ ...order, note }));
  };

  const clearDraftOrder = () => {
    if (!selectedTableId) return;
    setDraftOrders((current) => {
      const rest = { ...current };
      delete rest[selectedTableId];
      return rest;
    });
  };

  const assignDailyOrderSequence = (order: PosOrder) => {
    if (order.order_sequence) return order;
    if (!payload?.store.id) return order;

    const key = `${sequenceStoragePrefix}_${payload.store.id}_${getTodayKey()}`;
    const nextSequence = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(nextSequence));

    const nextOrder = { ...order, order_sequence: nextSequence };
    setDraftOrders((current) => ({
      ...current,
      [order.table_id]: nextOrder,
    }));

    return nextOrder;
  };

  const buildOrderSheetText = (order: PosOrder) => {
    const table = payload?.tables.find((item) => item.id === order.table_id);
    const now = new Date();
    const orderNo = order.order_sequence || 1;
    const lines = [
      '',
      '              주문서 (주방)',
      '',
      `테이블:${table?.name || '테이블'}`,
      '--------------------------------',
      '메   뉴                         수량  비고',
      '--------------------------------',
      ...order.items.map((item) => {
        const name = `${item.menu_code ? `${item.menu_code}.` : ''}${item.name}`;
        const qty = String(item.quantity).padStart(3, ' ');
        return `${name.padEnd(30, ' ')}${qty}   신규`;
      }),
      '--------------------------------',
      `일시 : ${now.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} ${now.toLocaleTimeString('ko-KR', { hour12: false })}  관리자`,
      `주문순서:${orderNo}`,
      order.note ? `메모:${order.note}` : '',
      '',
    ].filter(Boolean);

    return lines.join('\n');
  };

  const printKitchenOrderSheet = (order: PosOrder) => {
    const table = payload?.tables.find((item) => item.id === order.table_id);

    if (window.AndroidBridge?.printKitchenOrderSheet) {
      return window.AndroidBridge.printKitchenOrderSheet(
        table?.name || '테이블',
        order.order_sequence || 1,
        formatKitchenPrintedAt(),
        JSON.stringify(order.items.map((item) => ({
          name: item.name,
          menuCode: item.menu_code,
          quantity: item.quantity,
          note: '신규',
        })))
      );
    }

    return printStyledText(buildOrderSheetText(order), 34, false);
  };

  const buildPaymentReceiptText = (order: PosOrder) => {
    const table = payload?.tables.find((item) => item.id === order.table_id);
    const goodsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxableTotal = goodsTotal;
    const vat = Math.round(taxableTotal * 0.08);
    const receiptTotal = taxableTotal + vat;
    const method = order.payment_method || paymentMethod;
    const received = method === '현금' ? receiptTotal : 0;
    const change = method === '현금' ? 0 : 0;
    const storeName = payload?.store.name || 'RESTAURANT';
    const lines = [
      '',
      `              ${storeName.toUpperCase()}`,
      '',
      `${table?.name || '테이블'}`,
      `사업자번호 :${payload?.store.businessRegNo || ''}`,
      `주소 :${payload?.store.address || ''}`,
      `성명 :${payload?.store.representativeName || storeName}`,
      `전화 :${payload?.store.contact || ''}`,
      `일자 : ${formatReceiptPrintedAt()}`,
      '--------------------------------',
      '품명                    단가    수량      금액',
      '--------------------------------',
      ...order.items.map((item) => {
        const amount = item.price * item.quantity;
        return `${item.menu_code ? `${item.menu_code}.` : ''}${item.name}\n${String(item.price.toLocaleString()).padStart(27, ' ')} ${String(item.quantity).padStart(4, ' ')} ${String(amount.toLocaleString()).padStart(10, ' ')}`;
      }),
      '--------------------------------',
      `소  계:${String(receiptTotal.toLocaleString()).padStart(32, ' ')}`,
      '--------------------------------',
      '품명 앞에 * 표시가 되어있는 품목은',
      '부가세 면세 품목입니다.',
      `부가세 과세 물품가액:${String(taxableTotal.toLocaleString()).padStart(16, ' ')}`,
      `부      가      세:${String(vat.toLocaleString()).padStart(16, ' ')}`,
      `부가세 면세 물품가액:${String(0).padStart(16, ' ')}`,
      '--------------------------------',
      `청구금액:${String(receiptTotal.toLocaleString()).padStart(28, ' ')}`,
      `받은금액:${String(received.toLocaleString()).padStart(28, ' ')}`,
      `거스름돈:${String(change.toLocaleString()).padStart(28, ' ')}`,
      '--------------------------------',
      `${method.padEnd(6, ' ')}:${String(receiptTotal.toLocaleString()).padStart(28, ' ')}`,
      '--------------------------------',
      '정성을 다하겠습니다.',
      '계산자 : 관리자',
      '',
    ];

    return lines.join('\n');
  };

  const printPaymentReceipt = (order: PosOrder) => {
    const table = payload?.tables.find((item) => item.id === order.table_id);
    const goodsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxableTotal = goodsTotal;
    const vat = Math.round(taxableTotal * 0.08);
    const receiptTotal = taxableTotal + vat;
    const method = order.payment_method || paymentMethod;

    if (window.AndroidBridge?.printPaymentReceipt) {
      return window.AndroidBridge.printPaymentReceipt(
        payload?.store.name || 'RESTAURANT',
        table?.name || '테이블',
        payload?.store.businessRegNo || '',
        payload?.store.address || '',
        payload?.store.representativeName || payload?.store.name || 'RESTAURANT',
        payload?.store.contact || '',
        formatReceiptPrintedAt(),
        method,
        taxableTotal,
        vat,
        receiptTotal,
        JSON.stringify(order.items.map((item) => ({
          name: item.name,
          menuCode: item.menu_code,
          price: item.price,
          quantity: item.quantity,
          amount: item.price * item.quantity,
        })))
      );
    }

    return printStyledText(buildPaymentReceiptText({ ...order, payment_method: method }), 30, false);
  };

  const buildReturnOrder = (order: PosOrder): PosOrder => ({
    ...order,
    id: `return_${order.id}_${Date.now()}`,
    status: 'RETURNED',
    total: -Math.abs(order.total),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: new Date().toISOString(),
    items: order.items.map((item) => ({
      ...item,
      id: `return_${item.id}`,
      quantity: -Math.abs(item.quantity),
      price: Math.abs(item.price),
    })),
  });

  const returnOrder = async (order: PosOrder) => {
    if (order.status === 'RETURNED') {
      alert('이미 반품 처리된 이력입니다.');
      return;
    }

    if (!confirm('이 주문을 반품 처리할까요?\n\n수량과 금액이 마이너스로 표시된 반품 영수증이 출력됩니다.')) {
      return;
    }

    const returnSnapshot = buildReturnOrder(order);
    const success = printPaymentReceipt(returnSnapshot);
    if (!success && !confirm('반품 영수증 출력에 실패했습니다. 그래도 반품 이력을 저장할까요?')) {
      return;
    }

    const returnHistoryDate = getTodayInputDate();
    setHistoryDate(returnHistoryDate);

    await postAction({
      action: 'order.returnSnapshot',
      historyDate: returnHistoryDate,
      tableId: order.table_id,
      paymentMethod: order.payment_method || paymentMethod,
      note: `반품: ${order.id}`,
      items: order.items.map((item) => ({
        menuId: item.menu_id,
        menuCode: item.menu_code,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        itemType: item.item_type,
      })),
    });
  };

  const printOrder = async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      alert('출력할 주문이 없습니다.');
      return;
    }

    const printableOrder = assignDailyOrderSequence({ ...currentOrder, total });
    const success = printKitchenOrderSheet(printableOrder);
    if (!success) {
      alert('프린터 출력에 실패했습니다. 프린트 관리에서 기본 프린터를 확인해주세요.');
      return;
    }
  };

  const closeOrder = async (shouldPrintReceipt: boolean) => {
    if (!currentOrder || currentOrder.items.length === 0) return;
    const orderForCheckout = assignDailyOrderSequence({ ...currentOrder, total, payment_method: paymentMethod });

    if (shouldPrintReceipt) {
      const success = printPaymentReceipt(orderForCheckout);
      if (!success && !confirm('출력에 실패했습니다. 그래도 결제완료 처리할까요?')) {
        return;
      }
    }

    setShowReceiptConfirm(false);
    await postAction({
      action: 'order.checkoutSnapshot',
      tableId: currentOrder.table_id,
      paymentMethod,
      note: orderForCheckout.note || '',
      items: orderForCheckout.items.map((item) => ({
        menuId: item.menu_id,
        menuCode: item.menu_code,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        itemType: item.item_type,
      })),
    });
    clearDraftOrder();
  };

  const renameTable = async (table: PosTable) => {
    const name = prompt('테이블 이름을 입력해주세요.', table.name)?.trim();
    if (!name || name === table.name) return;
    await postAction({ action: 'table.update', tableId: table.id, name });
  };

  const renameCategory = async (category: PosCategory) => {
    const name = prompt('카테고리 이름을 입력해주세요.', category.name)?.trim();
    if (!name || name === category.name) return;
    await postAction({ action: 'category.update', categoryId: category.id, name });
  };

  const editMenu = async (menu: PosMenu) => {
    const nextMenuCode = prompt('메뉴 고유 번호를 입력해주세요.', menu.menu_code)?.replace(/[^0-9]/g, '').trim();
    if (!nextMenuCode) return;
    const name = prompt('메뉴 이름을 입력해주세요.', menu.name)?.trim();
    if (!name) return;
    const priceText = prompt('가격을 입력해주세요.', String(menu.price))?.replace(/[^0-9]/g, '');
    if (priceText === undefined) return;
    await postAction({
      action: 'menu.update',
      menuId: menu.id,
      menuCode: nextMenuCode,
      name,
      price: Number(priceText || 0),
      isActive: menu.is_active,
    });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;

  if (!payload) {
    return <StoreRequiredNotice />;
  }

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'order', label: '주문', icon: <ReceiptText className="w-4 h-4" /> },
    { key: 'tables', label: '테이블', icon: <Table2 className="w-4 h-4" /> },
    { key: 'menus', label: '메뉴', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { key: 'history', label: '이력', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-6">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 min-w-0">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-gray-900">{t.nav_mini_receipt}</h1>
              <p className="text-xs text-gray-500 truncate">{payload.store.name}</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-4">
        {activeTab === 'order' && (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_340px] gap-4">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900">테이블</h2>
                <span className="text-xs text-gray-400">{payload.tables.length}개</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {payload.tables.length === 0 ? (
                  <button
                    onClick={() => setActiveTab('tables')}
                    className="col-span-2 lg:col-span-1 h-20 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-400"
                  >
                    테이블 추가
                  </button>
                ) : (
                  payload.tables.map((table) => {
                    const order = draftOrders[table.id];
                    const isActive = table.id === selectedTableId;
                    return (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTableId(table.id)}
                        className={`min-h-20 rounded-xl border p-3 text-left transition-colors ${
                          isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className="block font-bold text-gray-900">{table.name}</span>
                        <span className={`mt-2 inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          order ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {order ? formatMoney(order.total) : '비어있음'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="font-bold text-gray-900">메뉴</h2>
                <button onClick={() => setActiveTab('menus')} className="text-xs font-bold text-indigo-600">메뉴 관리</button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {payload.categories.length === 0 ? (
                  <button onClick={() => setActiveTab('menus')} className="h-10 px-4 rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                    카테고리 추가
                  </button>
                ) : (
                  payload.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`h-10 px-4 rounded-lg text-sm font-bold whitespace-nowrap ${
                        category.id === selectedCategoryId ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {(selectedCategory?.menus ?? []).filter((menu) => menu.is_active).length === 0 ? (
                  <div className="col-span-full py-14 text-center text-sm font-semibold text-gray-400">
                    등록된 메뉴가 없습니다.
                  </div>
                ) : (
                  selectedCategory?.menus.filter((menu) => menu.is_active).map((menu) => (
                    <button
                      key={menu.id}
                      disabled={!selectedTableId || saving}
                      onClick={() => addMenuToDraft(menu)}
                      className="min-h-24 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left hover:bg-indigo-50 hover:border-indigo-100 disabled:opacity-40"
                    >
                      <span className="block text-sm font-bold text-gray-900 leading-snug">{menu.name}</span>
                      <span className="block text-xs font-bold text-indigo-600 mt-2">{formatMoney(menu.price)}</span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-32 h-fit">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">{selectedTable?.name || '테이블 선택'}</h2>
                  <p className="text-xs text-gray-500 mt-1">현재 주문</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">합계</p>
                  <p className="text-xl font-black text-indigo-600">{formatMoney(total)}</p>
                </div>
              </div>

              <div className="space-y-2 min-h-48">
                {!currentOrder || currentOrder.items.length === 0 ? (
                  <div className="h-48 rounded-xl bg-gray-50 flex items-center justify-center text-sm font-semibold text-gray-400">
                    메뉴를 선택해주세요.
                  </div>
                ) : (
                  currentOrder.items.map((item) => (
                    <div key={item.id} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{formatMoney(item.price)}</p>
                        </div>
                        <p className="font-black text-sm text-gray-900">{formatMoney(item.price * item.quantity)}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={() => updateDraftItemQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                        <button
                          onClick={() => updateDraftItemQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_88px_92px] gap-2">
                  <input
                    value={customItemName}
                    onChange={(event) => setCustomItemName(event.target.value)}
                    placeholder="직접 항목"
                    minLength={0}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  />
                  <input
                    value={customItemPrice}
                    onChange={(event) => setCustomItemPrice(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="금액"
                    inputMode="numeric"
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!selectedTableId || !customItemName.trim() || saving}
                    onClick={async () => {
                      addCustomItemToDraft(customItemName, Number(customItemPrice || 0), 'CUSTOM');
                      setCustomItemName('');
                      setCustomItemPrice('');
                    }}
                  >
                    항목 추가
                  </Button>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                  <input
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="할인 금액"
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!selectedTableId || !discountAmount || saving}
                    onClick={async () => {
                      addCustomItemToDraft('할인', -Math.abs(Number(discountAmount || 0)), 'DISCOUNT');
                      setDiscountAmount('');
                    }}
                  >
                    할인 추가
                  </Button>
                </div>
                <textarea
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  onBlur={() => updateDraftNote(orderNote)}
                  placeholder="주문 메모"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none"
                />
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold"
                >
                  <option value="현금">현금</option>
                  <option value="카드">카드</option>
                  <option value="계좌이체">계좌이체</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!currentOrder || saving}
                  onClick={clearDraftOrder}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  비우기
                </Button>
                <Button
                  type="button"
                  disabled={!currentOrder || currentOrder.items.length === 0}
                  onClick={printOrder}
                  icon={<Printer className="w-4 h-4" />}
                >
                  주문서 출력
                </Button>
                <Button
                  type="button"
                  variant="success"
                  className="col-span-2"
                  disabled={!currentOrder || currentOrder.items.length === 0 || saving}
                  onClick={() => setShowReceiptConfirm(true)}
                >
                  결제하기
                </Button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-bold text-gray-900 mb-3">테이블 추가</h2>
              <div className="flex gap-2">
                <input
                  value={tableName}
                  onChange={(event) => setTableName(event.target.value)}
                  placeholder="예: 1번 테이블"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                />
                <Button
                  type="button"
                  disabled={!tableName.trim() || saving}
                  onClick={async () => {
                    await postAction({ action: 'table.create', name: tableName });
                    setTableName('');
                  }}
                >
                  추가
                </Button>
              </div>
            </section>
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-bold text-gray-900 mb-3">테이블 목록</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {payload.tables.map((table) => (
                  <div key={table.id} className="rounded-xl bg-gray-50 p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{table.name}</p>
                      <p className="text-xs text-gray-500">{table.status === 'OCCUPIED' ? '주문중' : '비어있음'}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => renameTable(table)}
                        className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${table.name} 테이블을 삭제할까요?`)) {
                            postAction({ action: 'table.delete', tableId: table.id });
                          }
                        }}
                        className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'menus' && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-5">
              <div>
                <h2 className="font-bold text-gray-900 mb-3">카테고리 추가</h2>
                <div className="flex gap-2">
                  <input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="예: 식사"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  />
                  <Button
                    type="button"
                    disabled={!categoryName.trim() || saving}
                    onClick={async () => {
                      await postAction({ action: 'category.create', name: categoryName });
                      setCategoryName('');
                    }}
                  >
                    추가
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="font-bold text-gray-900 mb-3">메뉴 추가</h2>
                <div className="space-y-2">
                  <select
                    value={menuCategoryId}
                    onChange={(event) => setMenuCategoryId(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  >
                    {payload.categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <input
                    value={menuCode}
                    onChange={(event) => setMenuCode(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="고유 번호 예: 01"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  />
                  <input
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                    placeholder="메뉴명"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  />
                  <input
                    value={menuPrice}
                    onChange={(event) => setMenuPrice(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="가격"
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  />
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!menuCode.trim() || !menuName.trim() || !menuCategoryId || saving}
                    onClick={async () => {
                      await postAction({
                        action: 'menu.create',
                        categoryId: menuCategoryId,
                        menuCode,
                        name: menuName,
                        price: Number(menuPrice || 0),
                      });
                      setMenuCode('');
                      setMenuName('');
                      setMenuPrice('');
                    }}
                  >
                    메뉴 추가
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {payload.categories.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-sm font-semibold text-gray-400">
                  카테고리를 먼저 추가해주세요.
                </div>
              ) : (
                payload.categories.map((category) => (
                  <div key={category.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-gray-900">{category.name}</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => renameCategory(category)}
                          className="text-xs font-bold text-gray-500"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => {
                            const menuCount = category.menus.length;
                            const message = menuCount > 0
                              ? `${category.name} 카테고리를 삭제할까요?\n\n이 카테고리 안의 메뉴 ${menuCount}개도 모두 삭제됩니다.`
                              : `${category.name} 카테고리를 삭제할까요?`;
                            if (confirm(message)) {
                              postAction({ action: 'category.delete', categoryId: category.id });
                            }
                          }}
                          className="text-xs font-bold text-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.menus.length === 0 ? (
                        <div className="text-sm text-gray-400 py-4">메뉴 없음</div>
                      ) : (
                        category.menus.map((menu) => (
                          <div key={menu.id} className={`rounded-xl p-3 flex items-center justify-between gap-2 ${menu.is_active ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
                            <div>
                              <p className="font-bold text-gray-900">
                                <span className="text-indigo-600">{menu.menu_code}</span> {menu.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatMoney(menu.price)} {menu.is_active ? '' : '· 숨김'}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => editMenu(menu)}
                                className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => postAction({
                                  action: 'menu.update',
                                  menuId: menu.id,
                                  menuCode: menu.menu_code,
                                  name: menu.name,
                                  price: menu.price,
                                  isActive: !menu.is_active,
                                })}
                                className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500"
                              >
                                {menu.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`${menu.name} 메뉴를 삭제할까요?`)) {
                                    postAction({ action: 'menu.delete', menuId: menu.id });
                                  }
                                }}
                                className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-bold text-gray-900">결제완료 이력</h2>
              <input
                type="date"
                value={historyDate}
                onChange={(event) => {
                  const nextDate = event.target.value || getTodayInputDate();
                  setHistoryDate(nextDate);
                  setExpandedHistoryId('');
                  void loadData(nextDate);
                }}
                className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-700"
              />
            </div>
            <div className="space-y-2">
              {payload.history.length === 0 ? (
                <div className="py-12 text-center text-sm font-semibold text-gray-400">아직 이력이 없습니다.</div>
              ) : (
                payload.history.map((order) => {
                  const table = payload.tables.find((item) => item.id === order.table_id);
                  const isExpanded = expandedHistoryId === order.id;
                  const isReturned = order.status === 'RETURNED';
                  const hasReturnRecord = payload.history.some((item) => (
                    item.status === 'RETURNED' && item.note === `반품: ${order.id}`
                  ));
                  return (
                    <div key={order.id} className="rounded-xl bg-gray-50 p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(isExpanded ? '' : order.id)}
                        className="w-full flex items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{table?.name || '테이블'}</p>
                            {isReturned ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">반품</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.closed_at)} {order.payment_method ? `· ${order.payment_method}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${isReturned ? 'text-red-600' : 'text-indigo-600'}`}>{formatMoney(order.total)}</p>
                          <p className="mt-1 text-xs font-bold text-gray-400">{isExpanded ? '접기' : '상세보기'}</p>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-gray-900">
                                    {item.menu_code ? `${item.menu_code}.` : ''}{item.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatMoney(item.price)} x {item.quantity}
                                  </p>
                                </div>
                                <p className={`shrink-0 text-sm font-black ${item.price * item.quantity < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                  {formatMoney(item.price * item.quantity)}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const success = printPaymentReceipt(order);
                                if (!success) alert('재출력에 실패했습니다. 프린터를 확인해주세요.');
                              }}
                            >
                              재출력
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isReturned || hasReturnRecord || saving}
                              onClick={() => returnOrder(order)}
                            >
                              {hasReturnRecord ? '반품완료' : '반품'}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
      {showReceiptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">영수증을 출력하시겠습니까?</h2>
            <p className="mt-2 text-sm text-gray-500">예를 누르면 영수증을 출력한 뒤 결제완료 처리합니다.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => closeOrder(false)}
              >
                아니요
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={() => closeOrder(true)}
              >
                예
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
