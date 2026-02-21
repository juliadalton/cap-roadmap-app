import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/functionality-epics - List all functionality epics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const acquisitionId = searchParams.get('acquisitionId');

    const whereClause = acquisitionId ? { acquisitionId } : {};

    const epics = await prisma.functionalityEpic.findMany({
      where: whereClause,
      include: {
        acquisition: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(epics);
  } catch (error) {
    console.error("Failed to fetch functionality epics:", error);
    return NextResponse.json({ error: 'Failed to fetch functionality epics' }, { status: 500 });
  }
}

// POST /api/functionality-epics - Create a new functionality epic
export async function POST(request: Request) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.acquisitionId || !body.epicId || !body.epicName) {
      return NextResponse.json({ error: 'Missing required fields: acquisitionId, epicId, epicName' }, { status: 400 });
    }

    const newEpic = await prisma.functionalityEpic.create({
      data: {
        acquisitionId: body.acquisitionId,
        epicId: body.epicId,
        epicName: body.epicName,
        epicStatus: body.epicStatus || null,
        epicAcquiredCompany: body.epicAcquiredCompany || null,
        epicLink: body.epicLink || null,
      },
      include: {
        acquisition: true,
      },
    });
    
    return NextResponse.json(newEpic, { status: 201 });
  } catch (error) {
    console.error("Failed to create functionality epic:", error);
    return NextResponse.json({ error: 'Failed to create functionality epic' }, { status: 500 });
  }
}
