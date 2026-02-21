import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/projects - List all projects
export async function GET(request: Request) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        acquisitions: true,
        startMilestone: true,
        endMilestone: true,
        epics: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    if (!body.acquisitionIds || body.acquisitionIds.length === 0) {
      return NextResponse.json({ error: 'Project must be associated with at least one acquisition' }, { status: 400 });
    }

    // Ensure milestone IDs are properly null when not set (handle "none", empty strings, undefined)
    const startMilestoneId = body.startMilestoneId && body.startMilestoneId !== "none" ? body.startMilestoneId : null;
    const endMilestoneId = body.endMilestoneId && body.endMilestoneId !== "none" ? body.endMilestoneId : null;

    const newProject = await prisma.project.create({
      data: {
        title: body.title,
        description: body.description || null,
        relevantLinks: body.relevantLinks || [],
        startMilestoneId,
        endMilestoneId,
        acquisitions: {
          connect: body.acquisitionIds.map((id: string) => ({ id })),
        },
      },
      include: {
        acquisitions: true,
        startMilestone: true,
        endMilestone: true,
      },
    });
    
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

