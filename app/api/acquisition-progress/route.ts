import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/acquisition-progress - List all acquisition progress records
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const acquisitionId = searchParams.get('acquisitionId');

    const whereClause = acquisitionId ? { acquisitionId } : {};

    const progressRecords = await prisma.acquisitionProgress.findMany({
      where: whereClause,
      include: {
        acquisition: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(progressRecords);
  } catch (error) {
    console.error("Failed to fetch acquisition progress:", error);
    return NextResponse.json({ error: 'Failed to fetch acquisition progress' }, { status: 500 });
  }
}

// POST /api/acquisition-progress - Create a new acquisition progress record
export async function POST(request: Request) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.acquisitionId) {
      return NextResponse.json({ error: 'Missing required field: acquisitionId' }, { status: 400 });
    }

    const newProgress = await prisma.acquisitionProgress.create({
      data: {
        acquisitionId: body.acquisitionId,
        disposition: body.disposition || null,
        devPlatform: body.devPlatform ?? false,
        functionalityEpicsToDo: body.functionalityEpicsToDo ?? 0,
        functionalityEpicsInProgress: body.functionalityEpicsInProgress ?? 0,
        functionalityEpicsComplete: body.functionalityEpicsComplete ?? 0,
        clientCountTotal: body.clientCountTotal ?? 0,
        clientAccessCount: body.clientAccessCount ?? 0,
        clientActiveCount: body.clientActiveCount ?? 0,
      },
      include: {
        acquisition: true,
      },
    });
    
    return NextResponse.json(newProgress, { status: 201 });
  } catch (error) {
    console.error("Failed to create acquisition progress:", error);
    return NextResponse.json({ error: 'Failed to create acquisition progress' }, { status: 500 });
  }
}
