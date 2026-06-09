'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  Minus,
  MoreVertical,
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
import { useStores } from '@/components/providers/StoreProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PageHeader from '@/components/layout/PageHeader';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { renderMiniKitchenOrder, renderMiniPaymentReceipt } from '@/lib/mini-receipt-print';
import { nextDailyOrderSequence } from '@/lib/daily-order-sequence';

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

type TabKey = 'order' | 'tables' | 'menus' | 'history' | 'receiptSettings';
type DraftOrders = Record<string, PosOrder>;
type ReceiptPrintSettings = {
  businessRegNo: boolean;
  address: boolean;
  representativeName: boolean;
  contact: boolean;
};

type StoreSeed = PosPayload['store'];

const currency = '₫';
const draftStoragePrefix = 'mini_receipt_drafts_v1';
const receiptSettingsStoragePrefix = 'mini_receipt_receipt_settings_v1';
const payloadCachePrefix = 'mini_receipt_payload_v1';
const activeStoreStorageKey = 'store_active_selected_store_id';
const selectedStoreStorageKey = 'mini_receipt_selected_store_id';
const miniReceiptMemoryCache = new Map<string, PosPayload>();
const defaultReceiptPrintSettings: ReceiptPrintSettings = {
  businessRegNo: true,
  address: true,
  representativeName: true,
  contact: true,
};

function formatMoney(amount: number) {
  return `${amount.toLocaleString()} ${currency}`;
}

function textTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function createEmptyPayload(store: StoreSeed): PosPayload {
  return {
    store,
    tables: [],
    categories: [],
    orders: [],
    history: [],
  };
}

function getPayloadCacheKey(storeId: string, historyDate: string) {
  return `${storeId}_${historyDate}`;
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

function formatKitchenPrintedAt() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}`;
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

export default function MiniReceiptPage() {
  const t = useI18n();
  const { confirm, prompt } = useFeedback();
  const { stores, loading: storesLoading } = useStores();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<PosPayload | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('order');
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [tableName, setTableName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [menuCode, setMenuCode] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [editingMenu, setEditingMenu] = useState<PosMenu | null>(null);
  const [editMenuForm, setEditMenuForm] = useState({ menuCode: '', name: '', price: '' });
  const [menuCategoryId, setMenuCategoryId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('현금');
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [draftOrders, setDraftOrders] = useState<DraftOrders>({});
  const [receiptSettings, setReceiptSettings] = useState<ReceiptPrintSettings>(defaultReceiptPrintSettings);
  const [expandedHistoryId, setExpandedHistoryId] = useState('');
  const [historyDate, setHistoryDate] = useState(getTodayInputDate);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const manageMenuRef = useRef<HTMLDivElement | null>(null);
  const preferredStore = stores.find((store) => store.id === selectedStoreId) || stores[0] || null;
  const preferredStoreId = preferredStore?.id || '';

  useEffect(() => {
    if (storesLoading || stores.length === 0 || selectedStoreId) return;

    const storedStoreId = localStorage.getItem(activeStoreStorageKey) || localStorage.getItem(selectedStoreStorageKey);
    const nextStoreId = storedStoreId && stores.some((store) => store.id === storedStoreId)
      ? storedStoreId
      : stores[0].id;
    setSelectedStoreId(nextStoreId);
  }, [selectedStoreId, stores, storesLoading]);

  useEffect(() => {
    if (selectedStoreId) {
      localStorage.setItem(activeStoreStorageKey, selectedStoreId);
      localStorage.setItem(selectedStoreStorageKey, selectedStoreId);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (!showManageMenu) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!manageMenuRef.current?.contains(event.target as Node)) {
        setShowManageMenu(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [showManageMenu]);

  const applyPayload = (data: PosPayload) => {
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
    const storedReceiptSettings = localStorage.getItem(`${receiptSettingsStoragePrefix}_${data.store.id}`);
    setReceiptSettings(storedReceiptSettings
      ? { ...defaultReceiptPrintSettings, ...JSON.parse(storedReceiptSettings) as Partial<ReceiptPrintSettings> }
      : defaultReceiptPrintSettings);
  };

  const cachePayload = (data: PosPayload, nextHistoryDate = historyDate) => {
    const cacheKey = getPayloadCacheKey(data.store.id, nextHistoryDate);
    miniReceiptMemoryCache.set(cacheKey, data);
    localStorage.setItem(`${payloadCachePrefix}_${cacheKey}`, JSON.stringify(data));
  };

  const loadData = async (nextHistoryDate = historyDate) => {
    if (!preferredStoreId) {
      setPayload(null);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ storeId: preferredStoreId, historyDate: nextHistoryDate });
      const res = await fetch(`/api/store/mini-receipt?${params.toString()}`);
      if (!res.ok) {
        setPayload(null);
        return;
      }

      const data = (await res.json()) as PosPayload;
      applyPayload(data);
      cachePayload(data, nextHistoryDate);
    } catch (error) {
      console.error(error);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storesLoading) return;
    if (!preferredStoreId) {
      setPayload(null);
      setLoading(false);
      return;
    }

    try {
      const cacheKey = getPayloadCacheKey(preferredStoreId, historyDate);
      const memoryCached = miniReceiptMemoryCache.get(cacheKey);
      const localCached = !memoryCached ? localStorage.getItem(`${payloadCachePrefix}_${cacheKey}`) : null;
      if (memoryCached || localCached) {
        const cachedPayload = memoryCached ?? JSON.parse(localCached || '') as PosPayload;
        if (!memoryCached) miniReceiptMemoryCache.set(cacheKey, cachedPayload);
        applyPayload(cachedPayload);
        setLoading(false);
      } else if (preferredStore && !payload) {
        applyPayload(createEmptyPayload({
          id: preferredStore.id,
          name: preferredStore.name,
          currency: preferredStore.currency || currency,
          businessRegNo: preferredStore.businessRegNo,
          address: preferredStore.address,
          representativeName: preferredStore.representativeName,
          contact: preferredStore.contact,
        }));
        setLoading(false);
      }
    } catch {
      localStorage.removeItem(`${payloadCachePrefix}_${getPayloadCacheKey(preferredStoreId, historyDate)}`);
    }

    setLoading((current) => current && !payload);
    void loadData();
  }, [historyDate, preferredStoreId, storesLoading]);

  const { refreshing } = usePullToRefresh({
    disabled: storesLoading || !preferredStoreId || activeTab !== 'history',
    onRefresh: async () => {
      await loadData(historyDate);
    },
  });

  useEffect(() => {
    if (!payload?.store.id) return;
    localStorage.setItem(`${draftStoragePrefix}_${payload.store.id}`, JSON.stringify(draftOrders));
  }, [draftOrders, payload?.store.id]);

  useEffect(() => {
    if (!payload?.store.id) return;
    localStorage.setItem(`${receiptSettingsStoragePrefix}_${payload.store.id}`, JSON.stringify(receiptSettings));
  }, [receiptSettings, payload?.store.id]);

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
        alert(error.error || t.mini_process_failed);
        return;
      }

      const data = (await res.json()) as PosPayload;
      applyPayload(data);
      cachePayload(data);
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
      alert(t.mini_process_error);
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

  const menuQuantityMap = useMemo(() => {
    const quantities: Record<string, number> = {};
    currentOrder?.items.forEach((item) => {
      if (!item.menu_id) return;
      quantities[item.menu_id] = (quantities[item.menu_id] || 0) + item.quantity;
    });
    return quantities;
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

  const openManageTab = (tab: Exclude<TabKey, 'order'>) => {
    setActiveTab(tab);
    setShowManageMenu(false);
  };

  const updateReceiptSetting = (key: keyof ReceiptPrintSettings, value: boolean) => {
    setReceiptSettings((current) => ({ ...current, [key]: value }));
  };

  const clearDraftOrder = () => {
    if (!selectedTableId) return;
    setDraftOrders((current) => {
      const rest = { ...current };
      delete rest[selectedTableId];
      return rest;
    });
  };

  const moveOrMergeCurrentOrder = (targetTable: PosTable) => {
    if (!payload || !currentOrder || currentOrder.items.length === 0) return;
    if (targetTable.id === selectedTableId) {
      return;
    }

    setDraftOrders((current) => {
      const sourceOrder = current[selectedTableId] ?? currentOrder;
      const targetOrder = current[targetTable.id] ?? createDraftOrder(targetTable.id);
      const mergedItems = [...targetOrder.items];
      sourceOrder.items.forEach((item) => {
        const foundIndex = mergedItems.findIndex((targetItem) => (
          targetItem.menu_id === item.menu_id
          && targetItem.name === item.name
          && targetItem.price === item.price
          && targetItem.item_type === item.item_type
        ));
        if (foundIndex >= 0) {
          mergedItems[foundIndex] = {
            ...mergedItems[foundIndex],
            quantity: mergedItems[foundIndex].quantity + item.quantity,
          };
        } else {
          mergedItems.push(item);
        }
      });
      const rest = { ...current };
      delete rest[selectedTableId];
      const total = mergedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return {
        ...rest,
        [targetTable.id]: {
          ...targetOrder,
          items: mergedItems,
          total,
          note: [targetOrder.note, sourceOrder.note].filter(Boolean).join(' / ') || null,
        },
      };
    });
    setSelectedTableId(targetTable.id);
    setShowMoveTableModal(false);
  };

  const assignDailyOrderSequence = async (order: PosOrder) => {
    if (order.order_sequence) return order;
    if (!payload?.store.id) return order;

    const nextSequence = await nextDailyOrderSequence(payload.store.id);

    const nextOrder = { ...order, order_sequence: nextSequence };
    setDraftOrders((current) => ({
      ...current,
      [order.table_id]: nextOrder,
    }));

    return nextOrder;
  };
  const printKitchenOrderSheet = (order: PosOrder) => {
    const table = payload?.tables.find((item) => item.id === order.table_id);

    if (!window.AndroidBridge?.printBitmapDataUrl) {
      return false;
    }

    return window.AndroidBridge.printBitmapDataUrl(renderMiniKitchenOrder({
      tableName: table?.name || t.mini_table_fallback,
      orderSequence: order.order_sequence || 1,
      printedAt: formatKitchenPrintedAt(),
      note: order.note,
      items: order.items,
    }));
  };
  const printPaymentReceipt = (order: PosOrder) => {
    const table = payload?.tables.find((item) => item.id === order.table_id);
    const method = order.payment_method || paymentMethod;

    if (!window.AndroidBridge?.printBitmapDataUrl || !payload?.store) {
      return false;
    }

    return window.AndroidBridge.printBitmapDataUrl(renderMiniPaymentReceipt({
      store: payload.store,
      tableName: table?.name || t.mini_table_fallback,
      printedAt: formatReceiptPrintedAt(),
      paymentMethod: method,
      settings: receiptSettings,
      items: order.items,
    }));
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
      alert(t.mini_already_returned);
      return;
    }

    if (!(await confirm({ message: t.mini_return_confirm, danger: true }))) {
      return;
    }

    const returnSnapshot = buildReturnOrder(order);
    const success = printPaymentReceipt(returnSnapshot);
    if (!success && !(await confirm({ message: t.mini_return_print_failed_confirm }))) {
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
      alert(t.mini_no_order_to_print);
      return;
    }

    let printableOrder: PosOrder;
    try {
      printableOrder = await assignDailyOrderSequence({ ...currentOrder, total });
    } catch (error) {
      console.error(error);
      alert(t.mini_printer_failed);
      return;
    }
    const success = printKitchenOrderSheet(printableOrder);
    if (!success) {
      alert(t.mini_printer_failed);
      return;
    }
  };

  const closeOrder = async (shouldPrintReceipt: boolean) => {
    if (!currentOrder || currentOrder.items.length === 0) return;
    let orderForCheckout: PosOrder;
    try {
      orderForCheckout = await assignDailyOrderSequence({ ...currentOrder, total, payment_method: paymentMethod });
    } catch (error) {
      console.error(error);
      alert(t.mini_printer_failed);
      return;
    }

    if (shouldPrintReceipt) {
      const success = printPaymentReceipt(orderForCheckout);
      if (!success && !(await confirm({ message: t.mini_checkout_print_failed_confirm }))) {
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
    const name = (await prompt({
      message: t.mini_table_name_prompt,
      defaultValue: table.name,
    }))?.trim();
    if (!name || name === table.name) return;
    await postAction({ action: 'table.update', tableId: table.id, name });
  };

  const renameCategory = async (category: PosCategory) => {
    const name = (await prompt({
      message: t.mini_category_name_prompt,
      defaultValue: category.name,
    }))?.trim();
    if (!name || name === category.name) return;
    await postAction({ action: 'category.update', categoryId: category.id, name });
  };

  const openEditMenu = (menu: PosMenu) => {
    setEditingMenu(menu);
    setEditMenuForm({
      menuCode: menu.menu_code,
      name: menu.name,
      price: String(menu.price),
    });
  };

  const closeEditMenu = () => {
    setEditingMenu(null);
    setEditMenuForm({ menuCode: '', name: '', price: '' });
  };

  const submitEditMenu = async () => {
    if (!editingMenu) return;
    const nextMenuCode = editMenuForm.menuCode.replace(/[^0-9]/g, '').trim();
    const name = editMenuForm.name.trim();
    const price = Number(editMenuForm.price.replace(/[^0-9]/g, '') || 0);
    if (!nextMenuCode || !name) return;
    await postAction({
      action: 'menu.update',
      menuId: editingMenu.id,
      menuCode: nextMenuCode,
      name,
      price,
      isActive: editingMenu.is_active,
    });
    closeEditMenu();
  };

  if (!storesLoading && !payload) {
    return <StoreRequiredNotice />;
  }

  if (!payload) return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-6">
      <PageHeader
        title={t.nav_mini_receipt}
        subtitle={`${payload.store.name}${loading ? ` · ${t.mini_syncing}` : ''}`}
        icon={<ReceiptText className="w-5 h-5" />}
        maxWidth="max-w-6xl"
        actions={(
          <>
            {activeTab !== 'order' && (
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className="h-9 px-3 rounded-lg bg-gray-900 text-xs font-bold text-white"
              >
                {t.mini_order_screen}
              </button>
            )}
            <div ref={manageMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowManageMenu((current) => !current)}
                className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors"
                title={t.mini_manage_menu}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showManageMenu && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-100 bg-white shadow-lg p-1">
                  {stores.length > 1 && (
                    <div className="border-b border-gray-100 p-2">
                      <label className="mb-1 block text-[11px] font-black text-gray-500">상점 선택</label>
                      <select
                        value={preferredStoreId}
                        onChange={(event) => {
                          setSelectedStoreId(event.target.value);
                          setPayload(null);
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
                  <button
                    type="button"
                    onClick={() => openManageTab('tables')}
                    className="w-full h-10 px-3 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Table2 className="w-4 h-4" />
                    {t.mini_table_settings}
                  </button>
                  <button
                    type="button"
                    onClick={() => openManageTab('menus')}
                    className="w-full h-10 px-3 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    {t.mini_menu_settings}
                  </button>
                  <button
                    type="button"
                    onClick={() => openManageTab('history')}
                    className="w-full h-10 px-3 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {t.mini_history_management}
                  </button>
                  <button
                    type="button"
                    onClick={() => openManageTab('receiptSettings')}
                    className="w-full h-10 px-3 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ReceiptText className="w-4 h-4" />
                    {t.mini_receipt_form_settings}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      />

      <div className="max-w-6xl mx-auto px-4 mt-4">
        {activeTab === 'order' && (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_340px] gap-4">
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-bold text-gray-900">{t.mini_tables}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!currentOrder || currentOrder.items.length === 0}
                    onClick={() => setShowMoveTableModal(true)}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    이동합석
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tables')}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-black text-indigo-600 hover:bg-gray-50"
                  >
                    테이블 관리
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {payload.tables.length === 0 ? (
                  <button
                    onClick={() => setActiveTab('tables')}
                    className="col-span-2 lg:col-span-1 h-20 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-400"
                  >
                    {t.mini_add_table}
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
                        <span className="block break-words font-bold text-gray-900">{table.name}</span>
                        <span className={`mt-2 inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          order ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {order ? formatMoney(order.total) : t.mini_empty}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="font-bold text-gray-900">{t.mini_menu}</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('menus')}
                  className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-black text-indigo-600 hover:bg-gray-50"
                >
                  {t.mini_menu_manage}
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {payload.categories.length === 0 ? (
                  <button onClick={() => setActiveTab('menus')} className="h-10 px-4 rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                    {t.mini_add_category}
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
                    {t.mini_no_registered_menu}
                  </div>
                ) : (
                  selectedCategory?.menus.filter((menu) => menu.is_active).map((menu) => {
                    const selectedQuantity = menuQuantityMap[menu.id] || 0;
                    return (
                      <button
                        key={menu.id}
                        disabled={!selectedTableId || saving}
                        onClick={() => addMenuToDraft(menu)}
                        className={`relative min-h-24 rounded-xl border p-3 text-left disabled:opacity-40 ${
                          selectedQuantity > 0
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-100'
                        }`}
                      >
                        {selectedQuantity > 0 && (
                          <span className="absolute right-2 top-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
                            x{selectedQuantity}
                          </span>
                        )}
                        <span className={`block min-w-0 whitespace-normal break-words text-sm font-bold leading-snug text-gray-900 ${selectedQuantity > 0 ? 'pr-10' : ''}`}>
                          {menu.name}
                        </span>
                        <span className="block text-xs font-bold text-indigo-600 mt-2">{formatMoney(menu.price)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 lg:sticky lg:top-32 h-fit">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">{selectedTable?.name || t.mini_select_table}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t.mini_current_order}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{t.mini_total}</p>
                  <p className="text-xl font-black text-indigo-600">{formatMoney(total)}</p>
                </div>
              </div>

              <div className="space-y-2 min-h-48">
                {!currentOrder || currentOrder.items.length === 0 ? (
                  <div className="h-48 rounded-xl bg-gray-50 flex items-center justify-center text-sm font-semibold text-gray-400">
                    {t.mini_select_menu}
                  </div>
                ) : (
                  currentOrder.items.map((item) => (
                    <div key={item.id} className="min-w-0 rounded-xl bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-normal break-words text-sm font-bold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{formatMoney(item.price)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-gray-900">{formatMoney(item.price * item.quantity)}</p>
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

              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                <button
                  type="button"
                  onClick={() => setShowExtraInfo((current) => !current)}
                  className="flex w-full items-center justify-between text-sm font-black text-gray-800"
                >
                  <span>추가정보</span>
                  <span>{showExtraInfo ? '접기' : '펼치기'}</span>
                </button>
                {showExtraInfo && (
                  <div className="mt-3 space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_88px_92px] gap-2">
                  <input
                    value={customItemName}
                    onChange={(event) => setCustomItemName(event.target.value)}
                    placeholder={t.mini_custom_item}
                    minLength={0}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  />
                  <input
                    value={customItemPrice}
                    onChange={(event) => setCustomItemPrice(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={t.mini_amount}
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
                    {t.mini_add_item}
                  </Button>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                  <input
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={t.mini_discount_amount}
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!selectedTableId || !discountAmount || saving}
                    onClick={async () => {
                      addCustomItemToDraft(t.mini_discount, -Math.abs(Number(discountAmount || 0)), 'DISCOUNT');
                      setDiscountAmount('');
                    }}
                  >
                    {t.mini_add_discount}
                  </Button>
                </div>
                <textarea
                  value={orderNote}
                  onChange={(event) => {
                    setOrderNote(event.target.value);
                    updateDraftNote(event.target.value);
                  }}
                  placeholder={t.mini_order_note}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none"
                />
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-black text-gray-800">{t.mini_final_amount}</span>
                <span className="text-2xl font-black text-indigo-700">{formatMoney(total)}</span>
              </div>

              <div className="space-y-2 mt-3">
                <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-2">
                  <Button
                    type="button"
                    className="h-16 text-base"
                    disabled={!currentOrder || currentOrder.items.length === 0}
                    onClick={printOrder}
                    icon={<Printer className="w-5 h-5" />}
                  >
                    주방주문서 출력
                  </Button>
                  <button
                    type="button"
                    disabled={!currentOrder || saving}
                    onClick={clearDraftOrder}
                    title={t.mini_clear}
                    className="h-16 rounded-lg border border-red-100 bg-red-50 text-red-600 flex items-center justify-center transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-sm font-bold"
                >
                  <option value="현금">{t.mini_cash}</option>
                  <option value="카드">{t.mini_card}</option>
                  <option value="계좌이체">{t.mini_bank_transfer}</option>
                  <option value="기타">{t.mini_other}</option>
                </select>
                <Button
                  type="button"
                  variant="success"
                  className="h-16 w-full text-lg"
                  disabled={!currentOrder || currentOrder.items.length === 0 || saving}
                  onClick={() => setShowReceiptConfirm(true)}
                >
                  메인영수증 출력
                </Button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-bold text-gray-900 mb-3">{t.mini_add_table}</h2>
              <div className="flex gap-2">
                <input
                  value={tableName}
                  onChange={(event) => setTableName(event.target.value)}
                  placeholder={t.mini_add_table}
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
                  {t.mini_add_item}
                </Button>
              </div>
            </section>
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-bold text-gray-900 mb-3">{t.mini_table_list}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {payload.tables.map((table) => (
                  <div key={table.id} className="rounded-xl bg-gray-50 p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{table.name}</p>
                      <p className="text-xs text-gray-500">{table.status === 'OCCUPIED' ? t.mini_ordering : t.mini_empty}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => renameTable(table)}
                        className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirm({
                            message: textTemplate(t.mini_table_delete_confirm, { name: table.name }),
                            danger: true,
                          })) {
                            await postAction({ action: 'table.delete', tableId: table.id });
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
                <h2 className="font-bold text-gray-900 mb-3">{t.mini_add_category}</h2>
                <div className="flex gap-2">
                  <input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder={t.mini_category_name_placeholder}
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
                    {t.mini_add_item}
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="font-bold text-gray-900 mb-3">{t.mini_add_menu}</h2>
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
                    placeholder={t.mini_menu_code_placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  />
                  <input
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                    placeholder={t.mini_menu_name_placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  />
                  <input
                    value={menuPrice}
                    onChange={(event) => setMenuPrice(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={t.mini_price_placeholder}
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
                    {t.mini_add_menu}
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {payload.categories.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-sm font-semibold text-gray-400">
                  {t.mini_add_category_first}
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
                          {t.mini_edit}
                        </button>
                        <button
                          onClick={async () => {
                            const menuCount = category.menus.length;
                            const message = menuCount > 0
                              ? textTemplate(t.mini_category_delete_with_menus_confirm, { name: category.name, count: menuCount })
                              : textTemplate(t.mini_category_delete_confirm, { name: category.name });
                            if (await confirm({ message, danger: true })) {
                              await postAction({ action: 'category.delete', categoryId: category.id });
                            }
                          }}
                          className="text-xs font-bold text-red-500"
                        >
                          {t.mini_delete}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.menus.length === 0 ? (
                        <div className="text-sm text-gray-400 py-4">{t.mini_no_menu}</div>
                      ) : (
                        category.menus.map((menu) => (
                          <div key={menu.id} className={`flex items-start justify-between gap-2 rounded-xl p-3 ${menu.is_active ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
                            <div className="min-w-0 flex-1">
                              <p className="whitespace-normal break-words font-bold text-gray-900">
                                <span className="text-indigo-600">{menu.menu_code}</span> {menu.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatMoney(menu.price)} {menu.is_active ? '' : `· ${t.mini_hidden}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => openEditMenu(menu)}
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
                                onClick={async () => {
                                  if (await confirm({
                                    message: textTemplate(t.mini_menu_delete_confirm, { name: menu.name }),
                                    danger: true,
                                  })) {
                                    await postAction({ action: 'menu.delete', menuId: menu.id });
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
            {refreshing && (
              <div className="mb-3 rounded-xl bg-indigo-50 px-4 py-2 text-center text-xs font-bold text-indigo-600">
                {t.mini_history_refreshing}
              </div>
            )}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-bold text-gray-900">{t.mini_paid_history}</h2>
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
                <div className="py-12 text-center text-sm font-semibold text-gray-400">{t.mini_no_history}</div>
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
                            <p className="break-words font-bold text-gray-900">{table?.name || t.mini_tables}</p>
                            {isReturned ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">{t.mini_return}</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.closed_at)} {order.payment_method ? `· ${order.payment_method}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${isReturned ? 'text-red-600' : 'text-indigo-600'}`}>{formatMoney(order.total)}</p>
                          <p className="mt-1 text-xs font-bold text-gray-400">{isExpanded ? t.mini_collapse : t.mini_detail}</p>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="min-w-0 whitespace-normal break-words text-sm font-bold text-gray-900">
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
                                if (!success) alert(t.mini_reprint_failed);
                              }}
                            >
                              {t.monitor_reprint}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isReturned || hasReturnRecord || saving}
                              onClick={() => returnOrder(order)}
                            >
                              {hasReturnRecord ? t.mini_return_done : t.mini_return}
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

        {activeTab === 'receiptSettings' && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="mb-4">
              <h2 className="font-bold text-gray-900">{t.mini_receipt_form_settings}</h2>
              <p className="mt-1 text-xs text-gray-500">{t.mini_receipt_settings_desc}</p>
            </div>
            <div className="space-y-2">
              {([
                ['businessRegNo', t.mini_business_no],
                ['address', t.mini_address],
                ['representativeName', t.mini_representative_name],
                ['contact', t.mini_contact],
              ] as Array<[keyof ReceiptPrintSettings, string]>).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-bold text-gray-800">{label}</span>
                  <input
                    type="checkbox"
                    checked={receiptSettings[key]}
                    onChange={(event) => updateReceiptSetting(key, event.target.checked)}
                    className="h-5 w-5 accent-indigo-600"
                  />
                </label>
              ))}
            </div>
          </section>
        )}
      </div>
      {showMoveTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">이동합석</h2>
                <p className="mt-1 text-xs font-semibold text-gray-500">이동하거나 합석할 테이블을 선택해주세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoveTableModal(false)}
                className="h-9 w-9 rounded-lg border border-gray-200 text-sm font-black text-gray-500"
              >
                X
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {payload.tables.filter((table) => table.id !== selectedTableId).length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm font-bold text-gray-400">
                  이동할 다른 테이블이 없습니다.
                </div>
              ) : (
                payload.tables
                  .filter((table) => table.id !== selectedTableId)
                  .map((table) => {
                    const targetOrder = draftOrders[table.id];
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => moveOrMergeCurrentOrder(table)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
                      >
                        <span className="min-w-0 break-words text-sm font-black text-gray-900">{table.name}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          targetOrder ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {targetOrder ? `합석 ${formatMoney(targetOrder.total)}` : '이동'}
                        </span>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
      {editingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">{t.mini_edit}</h2>
                <p className="mt-1 text-xs font-semibold text-gray-500">메뉴번호, 메뉴명, 가격을 한 번에 수정합니다.</p>
              </div>
              <button
                type="button"
                onClick={closeEditMenu}
                className="h-9 w-9 rounded-lg border border-gray-200 text-sm font-black text-gray-500"
              >
                X
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">메뉴번호</span>
                <input
                  value={editMenuForm.menuCode}
                  onChange={(event) => setEditMenuForm((prev) => ({ ...prev, menuCode: event.target.value.replace(/[^0-9]/g, '') }))}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">메뉴명</span>
                <textarea
                  value={editMenuForm.name}
                  onChange={(event) => setEditMenuForm((prev) => ({ ...prev, name: event.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">가격</span>
                <input
                  value={editMenuForm.price}
                  onChange={(event) => setEditMenuForm((prev) => ({ ...prev, price: event.target.value.replace(/[^0-9]/g, '') }))}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                />
              </label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={closeEditMenu}>
                {t.mini_no}
              </Button>
              <Button
                type="button"
                disabled={!editMenuForm.menuCode.trim() || !editMenuForm.name.trim() || saving}
                onClick={submitEditMenu}
              >
                {saving ? '저장중' : t.mini_edit}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showReceiptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{t.mini_receipt_confirm_title}</h2>
            <p className="mt-2 text-sm text-gray-500">{t.mini_receipt_confirm_desc}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => closeOrder(false)}
              >
                {t.mini_no}
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={() => closeOrder(true)}
              >
                {t.mini_yes}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
