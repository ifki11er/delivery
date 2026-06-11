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
    options?: Array<{
      id: string;
      orderItemId: string;
      sideMenuId: string | null;
      groupName: string;
      name: string;
      price: number;
      quantity: number;
      sortOrder: number;
    }>;
  }>;
};

type CheckoutSnapshotItem = {
  menuId?: unknown;
  name?: unknown;
  menuCode?: unknown;
  price?: unknown;
  quantity?: unknown;
  itemType?: unknown;
  options?: unknown;
};

type CheckoutSnapshotOption = {
  sideMenuId?: unknown;
  groupName?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  sortOrder?: unknown;
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
  sideLinks?: Array<{
    sideMenu: {
      id: string;
      name: string;
      price: number;
      sortOrder: number;
      isActive: boolean;
    };
  }>;
}) {
  return {
    id: menu.id,
    category_id: menu.categoryId,
    menu_code: menu.menuCode,
    name: menu.name,
    price: menu.price,
    is_active: menu.isActive,
    sides: (menu.sideLinks ?? []).map(({ sideMenu }) => serializeSideMenu(sideMenu)),
  };
}

function serializeSideMenu(side: {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: side.id,
    name: side.name,
    price: side.price,
    sort_order: side.sortOrder,
    is_active: side.isActive,
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
  options?: Array<{
    id: string;
    sideMenuId: string | null;
    groupName: string;
    name: string;
    price: number;
    quantity: number;
    sortOrder: number;
  }>;
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
    options: (item.options ?? []).map((option) => ({
      id: option.id,
      side_menu_id: option.sideMenuId,
      group_name: option.groupName,
      name: option.name,
      price: option.price,
      quantity: option.quantity,
      sort_order: option.sortOrder,
    })),
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

function getHistoryDateRange(historyDate?: string | null, from?: string | null, to?: string | null) {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && toDate && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
    return { start: fromDate, end: toDate };
  }

  if (!historyDate || !/^\d{4}-\d{2}-\d{2}$/.test(historyDate)) return null;

  const start = new Date(`${historyDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

async function buildPayload(storeId: string, historyDate?: string | null, historyFrom?: string | null, historyTo?: string | null) {
  const historyRange = getHistoryDateRange(historyDate, historyFrom, historyTo);
  const [tables, categories, sideMenus, openOrders, closedOrders] = await Promise.all([
    prisma.posTable.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.posCategory.findMany({
      where: { storeId },
      include: {
        menus: {
          include: {
            sideLinks: {
              include: { sideMenu: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.posSideMenu.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.posOrder.findMany({
      where: { storeId, status: 'OPEN' },
      include: {
        items: {
          include: {
            options: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
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
          include: {
            options: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
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
    side_menus: sideMenus.map(serializeSideMenu),
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

  const payload = await buildPayload(
    store.id,
    searchParams.get('historyDate'),
    searchParams.get('historyFrom'),
    searchParams.get('historyTo'),
  );
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

      if (Array.isArray(body.sideMenuIds)) {
        const sideMenuIds = body.sideMenuIds.map((id: unknown) => String(id)).filter(Boolean);
        const validSideMenus = sideMenuIds.length > 0
          ? await prisma.posSideMenu.findMany({
              where: { storeId: store.id, id: { in: sideMenuIds } },
              select: { id: true },
            })
          : [];

        await prisma.$transaction([
          prisma.posMenuSide.deleteMany({ where: { menuId } }),
          ...validSideMenus.map((side, index) => prisma.posMenuSide.create({
            data: {
              id: newId(`menuside${index}`),
              menuId,
              sideMenuId: side.id,
              sortOrder: index,
            },
          })),
        ]);
      }
    }

    if (action === 'menu.delete') {
      await prisma.posMenu.deleteMany({
        where: { id: String(body.menuId), storeId: store.id },
      });
    }

    if (action === 'side.create') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Side name is required' }, { status: 400 });

      await prisma.posSideMenu.create({
        data: {
          id: newId('side'),
          storeId: store.id,
          name,
          price: Math.max(0, Number(body.price || 0)),
          sortOrder: Number(body.sortOrder || 0),
        },
      });
    }

    if (action === 'side.update') {
      const sideId = String(body.sideId || '');
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Side name is required' }, { status: 400 });

      await prisma.posSideMenu.updateMany({
        where: { id: sideId, storeId: store.id },
        data: {
          name,
          price: Math.max(0, Number(body.price || 0)),
          sortOrder: Number(body.sortOrder || 0),
          isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        },
      });
    }

    if (action === 'side.delete') {
      await prisma.posSideMenu.deleteMany({
        where: { id: String(body.sideId || ''), storeId: store.id },
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
      const sanitizedItems = items.map((item, index) => {
        const quantity = isReturn
          ? -Math.max(1, Math.abs(Number(item.quantity || 1)))
          : Math.max(1, Number(item.quantity || 1));
        const options = Array.isArray(item.options) ? item.options as CheckoutSnapshotOption[] : [];
        const sanitizedOptions = options.map((option, optionIndex) => ({
          id: newId(`itemopt${index}_${optionIndex}`),
          sideMenuId: typeof option.sideMenuId === 'string' && option.sideMenuId ? option.sideMenuId : null,
          groupName: String(option.groupName || '').trim(),
          name: String(option.name || '').trim(),
          price: Math.abs(Number(option.price || 0)),
          quantity: Math.max(1, Number(option.quantity || 1)),
          sortOrder: Number(option.sortOrder || optionIndex),
        })).filter((option) => option.name);

        return {
          id: newId(`item${index}`),
          menuId: typeof item.menuId === 'string' && item.menuId ? item.menuId : null,
          name: String(item.name || '').trim() || '항목',
          menuCode: String(item.menuCode || '').replace(/[^0-9]/g, '').trim(),
          price: Math.abs(Number(item.price || 0)),
          quantity,
          itemType: String(item.itemType || 'MENU'),
          options: sanitizedOptions,
        };
      });
      const total = sanitizedItems.reduce((sum, item) => {
        const optionTotal = item.options.reduce((optionSum, option) => optionSum + option.price * option.quantity, 0);
        return sum + (item.price + optionTotal) * item.quantity;
      }, 0);

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
            create: sanitizedItems.map((item) => ({
              id: item.id,
              menuId: item.menuId,
              name: item.name,
              menuCode: item.menuCode,
              price: item.price,
              quantity: item.quantity,
              itemType: item.itemType,
              options: {
                create: item.options,
              },
            })),
          },
        },
      });

    }

    const payload = await buildPayload(
      store.id,
      String(body.historyDate || ''),
      typeof body.historyFrom === 'string' ? body.historyFrom : null,
      typeof body.historyTo === 'string' ? body.historyTo : null,
    );
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
