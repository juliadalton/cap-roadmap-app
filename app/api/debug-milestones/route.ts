import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Debug: Starting milestone query...');
    
    // Test basic database connection
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Debug: Database connection test:', dbTest);
    
    // Test milestone count
    const count = await prisma.milestone.count();
    console.log('Debug: Milestone count:', count);
    
    // Test the actual query that's failing
    const milestones = await prisma.milestone.findMany({
      orderBy: { date: 'asc' },
    });
    console.log('Debug: Milestones found:', milestones.length);
    
    return NextResponse.json({
      status: 'success',
      dbTest,
      milestoneCount: count,
      milestones: milestones
    });
    
  } catch (error: any) {
    console.error('Debug: Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    }, { status: 500 });
  }
}
