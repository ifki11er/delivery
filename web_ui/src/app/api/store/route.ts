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
      where: { ownerId: session.user.id },
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
    const { id, name, wifiIpAddress, newOwnerEmail, address, contact, representativeName, businessRegNo, currency } = body;

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
    if (newOwnerEmail) {
      const newOwner = await prisma.user.findUnique({ where: { email: newOwnerEmail } });
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

    return NextResponse.json(store);
  } catch (error) {
    console.error('[API Store PUT Error]:', error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
