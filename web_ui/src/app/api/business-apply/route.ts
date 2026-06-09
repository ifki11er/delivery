import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json(
    { error: '상점 입점 신청은 더 이상 사용하지 않습니다.' },
    { status: 410 },
  );
}
