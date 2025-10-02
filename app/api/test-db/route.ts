import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Simple database connection test
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    return NextResponse.json({ status: 'Database connected', result });
  } catch (error) {
    return NextResponse.json({ 
      status: 'Database connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
