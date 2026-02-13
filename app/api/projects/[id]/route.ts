import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/projects/[id] - Get single project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        acquisitions: true,
        startMilestone: true,
        endMilestone: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Build the update data object
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.relevantLinks !== undefined) updateData.relevantLinks = body.relevantLinks;
    // Ensure milestone IDs are properly null when not set (handle "none", empty strings, undefined)
    if (body.startMilestoneId !== undefined) {
      updateData.startMilestoneId = body.startMilestoneId && body.startMilestoneId !== "none" ? body.startMilestoneId : null;
    }
    if (body.endMilestoneId !== undefined) {
      updateData.endMilestoneId = body.endMilestoneId && body.endMilestoneId !== "none" ? body.endMilestoneId : null;
    }
    
    // Handle acquisition connections
    if (body.acquisitionIds !== undefined) {
      updateData.acquisitions = {
        set: body.acquisitionIds.map((id: string) => ({ id })),
      };
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        acquisitions: true,
        startMilestone: true,
        endMilestone: true,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
