import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isEmployee: false });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    const emp = await prisma.employee.findFirst({
      where: { 
        userId: session.user.id,
        status: 'ACTIVE'
      },
      include: { store: true }
    });
    
    return NextResponse.json({ 
      isEmployee: !!emp,
      role: user?.role || session.user.role,
      empRole: emp?.role || null,
      storeName: emp?.store?.name || null
    });
  } catch (error) {
    console.error('[API Status GET Error]:', error);
    return NextResponse.json({ isEmployee: false, role: session.user.role });
  }
}
