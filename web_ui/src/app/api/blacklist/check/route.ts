import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This API is meant to be called by the Android Service in the background.
// It doesn't require session auth, but in a real-world scenario, you should 
// authenticate it using an API key or a special token passed by the Android app.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ isBlacklisted: false, error: 'Phone parameter is required' }, { status: 400 });
  }

  try {
    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    
    const entries = await prisma.blacklist.findMany({
      where: { phoneNumber: cleanedPhone }
    });

    if (entries.length > 0) {
      return NextResponse.json({ 
        isBlacklisted: true, 
        count: entries.length,
        reasons: entries.map(e => e.reason)
      });
    } else {
      return NextResponse.json({ isBlacklisted: false });
    }
  } catch (error) {
    return NextResponse.json({ isBlacklisted: false, error: 'Internal server error' }, { status: 500 });
  }
}
