import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stores = await prisma.store.findMany({
      where: {
        status: { not: 'CLOSED' },
        OR: [
          { ownerId: session.user.id },
          {
            employees: {
              some: {
                userId: session.user.id,
                role: 'MANAGER',
                status: 'ACTIVE'
              }
            }
          }
        ]
      },
      include: {
        _count: {
          select: { employees: true }
        }
      }
    });
    return NextResponse.json(stores);
  } catch (error) {
    console.error('[API Store GET Error]:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Owner or Admin can create stores (or upgrade to owner if not already)
  if (session.user.role === 'CUSTOMER') {
     // Optional: You could auto-upgrade the user to 'OWNER' here.
     await prisma.user.update({
       where: { id: session.user.id },
       data: { role: 'OWNER' }
     });
  }

  try {
    const body = await req.json();
    const { name, wifiIpAddress } = body;

    if (!name) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: {
        name,
        wifiIpAddress: wifiIpAddress || null,
        ownerId: session.user.id,
      }
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error('[API Store POST Error]:', error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, wifiIpAddress, newOwnerId, address, contact, representativeName, businessRegNo, currency } = body;

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Check ownership
    const existingStore = await prisma.store.findUnique({ where: { id } });
    if (!existingStore || existingStore.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let ownerId = session.user.id;

    // Handle transfer
    if (newOwnerId) {
      const newOwner = await prisma.user.findUnique({ where: { id: newOwnerId } });
      if (!newOwner) {
        return NextResponse.json({ error: 'User not found for transfer' }, { status: 404 });
      }
      ownerId = newOwner.id;
      // Upgrade role if necessary
      if (newOwner.role === 'CUSTOMER') {
        await prisma.user.update({ where: { id: newOwner.id }, data: { role: 'OWNER' } });
      }
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        name: name || undefined,
        address: address !== undefined ? address : undefined,
        contact: contact !== undefined ? contact : undefined,
        representativeName: representativeName !== undefined ? representativeName : undefined,
        businessRegNo: businessRegNo !== undefined ? businessRegNo : undefined,
        wifiIpAddress: wifiIpAddress !== undefined ? wifiIpAddress : undefined,
        currency: currency !== undefined ? currency : undefined,
        ownerId,
      }
    });

    // If transferred, check if the old owner has any stores left. If not, downgrade to CUSTOMER.
    if (newOwnerId && session.user.id !== newOwnerId) {
      const remainingStores = await prisma.store.count({
        where: { ownerId: session.user.id }
      });
      if (remainingStores === 0 && session.user.role === 'OWNER') {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { role: 'CUSTOMER' }
        });
      }
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('[API Store PUT Error]:', error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  // Only OWNER (or ADMIN) can delete a store
  if (!session?.user?.id || session.user.role === 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existingStore = await prisma.store.findUnique({ where: { id } });
    if (!existingStore || existingStore.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft Delete Store (Change status to CLOSED instead of hard deleting)
    await prisma.store.update({ 
      where: { id }, 
      data: { status: 'CLOSED' } 
    });

    // Check remaining active stores, downgrade to CUSTOMER if 0
    const remainingStores = await prisma.store.count({
      where: { 
        ownerId: session.user.id,
        status: { not: 'CLOSED' }
      }
    });

    if (remainingStores === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'CUSTOMER' }
      });
    }

    return NextResponse.json({ success: true, isSoftDeleted: true, remainingStores });
  } catch (error) {
    console.error('[API Store DELETE Error]:', error);
    return NextResponse.json({ error: 'Failed to close store' }, { status: 500 });
  }
}
