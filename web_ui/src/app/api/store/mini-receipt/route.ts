import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

type OrderWithItems = Awaited<ReturnType<typeof prisma.posOrder.findFirst>> & {
  items?: Array<{
    id: string;
    orderId: string;
    menuId: string | null;
    name: string;
    menuCode: string;
    price: number;
    quantity: number;
    itemType: string;
  }>;
};

type CheckoutSnapshotItem = {
  menuId?: unknown;
  name?: unknown;
  menuCode?: unknown;
  price?: unknown;
  quantity?: unknown;
  itemType?: unknown;
};

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeMenu(menu: {
  id: string;
  categoryId: string;
  menuCode: string;
  name: string;
  price: number;
  isActive: boolean;
}) {
  return {
    id: menu.id,
    category_id: menu.categoryId,
    menu_code: menu.menuCode,
    name: menu.name,
    price: menu.price,
    is_active: menu.isActive,
  };
}

function serializeItem(item: {
  id: string;
  orderId: string;
  menuId: string | null;
  name: string;
  menuCode: string;
  price: number;
  quantity: number;
  itemType: string;
}) {
  return {
    id: item.id,
    order_id: item.orderId,
    menu_id: item.menuId,
    name: item.name,
    menu_code: item.menuCode,
    price: item.price,
    quantity: item.quantity,
    item_type: item.itemType,
  };
}

function serializeOrder(order: NonNullable<OrderWithItems>) {
  return {
    id: order.id,
    table_id: order.tableId,
    status: order.status,
    note: order.note,
    payment_method: order.paymentMethod,
    total: order.total,
    order_sequence: order.orderSequence,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    closed_at: order.closedAt,
    items: (order.items ?? []).map(serializeItem),
  };
}

async function getAccessibleStore(userId: string, role: string | undefined, storeId?: string | null) {
  const stores = await prisma.store.findMany({
    where: {
      status: { not: 'CLOSED' },
      ...(storeId ? { id: storeId } : {}),
      OR: [
        { ownerId: userId },
        ...(role === 'ADMIN' ? [{}] : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return stores[0] ?? null;
}

function getHistoryDateRange(historyDate?: string | null) {
  if (!historyDate || !/^\d{4}-\d{2}-\d{2}$/.test(historyDate)) return null;

  const start = new Date(`${historyDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

async function buildPayload(storeId: string, historyDate?: string | null) {
  const historyRange = getHistoryDateRange(historyDate);
  const [tables, categories, openOrders, closedOrders] = await Promise.all([
    prisma.posTable.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.posCategory.findMany({
      where: { storeId },
      include: {
        menus: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.posOrder.findMany({
      where: { storeId, status: 'OPEN' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.posOrder.findMany({
      where: {
        storeId,
        status: { in: ['CLOSED', 'RETURNED'] },
        ...(historyRange ? {
          closedAt: {
            gte: historyRange.start,
            lt: historyRange.end,
          },
        } : {}),
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ closedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    }),
  ]);

  return {
    tables: tables.map((table) => ({
      id: table.id,
      name: table.name,
      status: table.status,
      sort_order: table.sortOrder,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sort_order: category.sortOrder,
      menus: category.menus.map(serializeMenu),
    })),
    orders: openOrders.map(serializeOrder),
    history: closedOrders.map(serializeOrder),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const store = await getAccessibleStore(session.user.id, session.user.role, searchParams.get('storeId'));
  if (!store) {
    return NextResponse.json({ error: 'No store found' }, { status: 404 });
  }

  const payload = await buildPayload(store.id, searchParams.get('historyDate'));
  return NextResponse.json({
    store: {
      id: store.id,
      name: store.name,
      currency: store.currency,
      businessRegNo: store.businessRegNo,
      address: store.address,
      representativeName: store.representativeName,
      contact: store.contact,
    },
    ...payload,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || '');
    const store = await getAccessibleStore(session.user.id, session.user.role, body.storeId);
    if (!store) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'table.create') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Table name is required' }, { status: 400 });

      await prisma.posTable.create({
        data: {
          id: newId('table'),
          storeId: store.id,
          name,
          sortOrder: Number(body.sortOrder || 0),
        },
      });
    }

    if (action === 'table.update') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Table name is required' }, { status: 400 });

      await prisma.posTable.updateMany({
        where: { id: String(body.tableId), storeId: store.id },
        data: { name },
      });
    }

    if (action === 'table.delete') {
      const tableId = String(body.tableId || '');
      const openOrderCount = await prisma.posOrder.count({
        where: { tableId, storeId: store.id, status: 'OPEN' },
      });
      if (openOrderCount > 0) {
        return NextResponse.json({ error: '주문중인 테이블은 삭제할 수 없습니다.' }, { status: 400 });
      }

      await prisma.posTable.deleteMany({
        where: { id: tableId, storeId: store.id },
      });
    }

    if (action === 'category.create') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

      await prisma.posCategory.create({
        data: {
          id: newId('cat'),
          storeId: store.id,
          name,
          sortOrder: Number(body.sortOrder || 0),
        },
      });
    }

    if (action === 'category.update') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

      await prisma.posCategory.updateMany({
        where: { id: String(body.categoryId), storeId: store.id },
        data: { name },
      });
    }

    if (action === 'category.delete') {
      const categoryId = String(body.categoryId || '');
      await prisma.posCategory.deleteMany({
        where: { id: categoryId, storeId: store.id },
      });
    }

    if (action === 'menu.create') {
      const name = String(body.name || '').trim();
      const menuCode = String(body.menuCode || '').replace(/[^0-9]/g, '').trim();
      const categoryId = String(body.categoryId || '');
      const price = Math.max(0, Number(body.price || 0));
      if (!name || !menuCode || !categoryId) {
        return NextResponse.json({ error: 'Menu code, name and category are required' }, { status: 400 });
      }

      const category = await prisma.posCategory.findFirst({
        where: { id: categoryId, storeId: store.id },
      });
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

      const duplicateMenu = await prisma.posMenu.findFirst({
        where: { storeId: store.id, menuCode },
      });
      if (duplicateMenu) {
        return NextResponse.json({ error: '이미 사용 중인 메뉴 고유 번호입니다.' }, { status: 400 });
      }

      await prisma.posMenu.create({
        data: {
          id: newId('menu'),
          storeId: store.id,
          categoryId,
          menuCode,
          name,
          price,
        },
      });
    }

    if (action === 'menu.update') {
      const name = String(body.name || '').trim();
      const menuCode = String(body.menuCode || '').replace(/[^0-9]/g, '').trim();
      if (!name || !menuCode) return NextResponse.json({ error: 'Menu code and name are required' }, { status: 400 });
      const menuId = String(body.menuId || '');

      const duplicateMenu = await prisma.posMenu.findFirst({
        where: {
          storeId: store.id,
          menuCode,
          id: { not: menuId },
        },
      });
      if (duplicateMenu) {
        return NextResponse.json({ error: '이미 사용 중인 메뉴 고유 번호입니다.' }, { status: 400 });
      }

      await prisma.posMenu.updateMany({
        where: { id: menuId, storeId: store.id },
        data: {
          menuCode,
          name,
          price: Math.max(0, Number(body.price || 0)),
          isActive: Boolean(body.isActive),
        },
      });
    }

    if (action === 'menu.delete') {
      await prisma.posMenu.deleteMany({
        where: { id: String(body.menuId), storeId: store.id },
      });
    }

    if (action === 'order.checkoutSnapshot' || action === 'order.returnSnapshot') {
      const tableId = String(body.tableId || '');
      const items: CheckoutSnapshotItem[] = Array.isArray(body.items) ? body.items : [];
      const paymentMethod = String(body.paymentMethod || '미기록');
      const note = String(body.note || '').trim();
      const orderSequence = typeof body.orderSequence === 'number' && Number.isFinite(body.orderSequence)
        ? body.orderSequence
        : null;
      const isReturn = action === 'order.returnSnapshot';
      const table = await prisma.posTable.findFirst({
        where: { id: tableId, storeId: store.id },
      });
      if (!table || items.length === 0) {
        return NextResponse.json({ error: '결제할 주문이 없습니다.' }, { status: 400 });
      }

      const orderId = newId('order');
      const sanitizedItems = items.map((item, index) => ({
        id: newId(`item${index}`),
        menuId: typeof item.menuId === 'string' && item.menuId ? item.menuId : null,
        name: String(item.name || '').trim() || '항목',
        menuCode: String(item.menuCode || '').replace(/[^0-9]/g, '').trim(),
        price: Math.abs(Number(item.price || 0)),
        quantity: isReturn
          ? -Math.max(1, Math.abs(Number(item.quantity || 1)))
          : Math.max(1, Number(item.quantity || 1)),
        itemType: String(item.itemType || 'MENU'),
      }));
      const total = sanitizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await prisma.posOrder.create({
        data: {
          id: orderId,
          storeId: store.id,
          tableId,
          status: isReturn ? 'RETURNED' : 'CLOSED',
          note,
          paymentMethod,
          total,
          orderSequence,
          closedAt: new Date(),
          items: {
            create: sanitizedItems,
          },
        },
      });

    }

    const payload = await buildPayload(store.id, String(body.historyDate || ''));
    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        currency: store.currency,
        businessRegNo: store.businessRegNo,
        address: store.address,
        representativeName: store.representativeName,
        contact: store.contact,
      },
      ...payload,
    });
  } catch (error) {
    console.error('[Mini Receipt API Error]:', error);
    return NextResponse.json({ error: 'Failed to process mini receipt request' }, { status: 500 });
  }
}
