import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const applications = await prisma.businessApplication.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error('[Business Apply GET Error]:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const businessName = formData.get('businessName') as string;
    const address = formData.get('address') as string;
    const contact = formData.get('contact') as string;
    const representativeName = formData.get('representativeName') as string;
    const businessRegNo = formData.get('businessRegNo') as string;
    const file = formData.get('file') as File | null;

    if (!businessName || !address || !contact || !representativeName || !businessRegNo || !file) {
      return NextResponse.json({ error: '모든 필드(파일 포함)를 입력해야 합니다.' }, { status: 400 });
    }

    let imageUrl = '';
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'business');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/business/${fileName}`;
    }

    const application = await prisma.businessApplication.create({
      data: {
        userId: session.user.id,
        businessName,
        address,
        contact,
        representativeName,
        businessRegNo,
        imageUrl,
        status: 'PENDING'
      }
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('[Business Apply POST Error]:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
