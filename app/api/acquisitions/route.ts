import { NextResponse } from 'next/server';
import { requireEditorSession } from '@/lib/auth';
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
    const { error } = await requireEditorSession();
    if (error) return error;

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
        progress: {
          create: {
            manualSync: body.manualSync === true,
            ...(body.disposition ? { disposition: body.disposition } : {}),
          },
        },
      },
      include: {
        projects: {
          include: {
            startMilestone: true,
            endMilestone: true,
          },
        },
        progress: true,
      },
    });
    
    return NextResponse.json(newAcquisition, { status: 201 });
  } catch (error) {
    console.error("Failed to create acquisition:", error);
    return NextResponse.json({ error: 'Failed to create acquisition' }, { status: 500 });
  }
}

