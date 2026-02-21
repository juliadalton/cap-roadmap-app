import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/acquisitions - List all acquisitions with their projects
export async function GET(request: Request) {
  try {
    const acquisitions = await prisma.acquisition.findMany({
      include: {
        projects: {
          include: {
            startMilestone: true,
            endMilestone: true,
          },
        },
        progress: true,
        epics: true,
        clientCounts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(acquisitions);
  } catch (error) {
    console.error("Failed to fetch acquisitions:", error);
    return NextResponse.json({ error: 'Failed to fetch acquisitions' }, { status: 500 });
  }
}

// POST /api/acquisitions - Create a new acquisition
export async function POST(request: Request) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const newAcquisition = await prisma.acquisition.create({
      data: {
        name: body.name,
        description: body.description || null,
        integrationOverview: body.integrationOverview || null,
        color: body.color || null,
      },
      include: {
        projects: {
          include: {
            startMilestone: true,
            endMilestone: true,
          },
        },
      },
    });
    
    return NextResponse.json(newAcquisition, { status: 201 });
  } catch (error) {
    console.error("Failed to create acquisition:", error);
    return NextResponse.json({ error: 'Failed to create acquisition' }, { status: 500 });
  }
}

