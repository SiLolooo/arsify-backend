import { NextResponse } from 'next/server';
import { testProvider } from '@/lib/providers/test';

export async function GET() {
  const result = await testProvider();

  return NextResponse.json({
    success: result,
  });
}