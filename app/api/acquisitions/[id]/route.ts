import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/acquisitions/[id] - Get single acquisition with projects
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const acquisition = await prisma.acquisition.findUnique({
      where: { id: params.id },
      include: {
        projects: {
          include: {
            startMilestone: true,
            endMilestone: true,
          },
        },
      },
    });

    if (!acquisition) {
      return NextResponse.json({ error: 'Acquisition not found' }, { status: 404 });
    }

    return NextResponse.json(acquisition);
  } catch (error) {
    console.error("Failed to fetch acquisition:", error);
    return NextResponse.json({ error: 'Failed to fetch acquisition' }, { status: 500 });
  }
}

// PATCH /api/acquisitions/[id] - Update acquisition
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    const updatedAcquisition = await prisma.acquisition.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.integrationOverview !== undefined && { integrationOverview: body.integrationOverview }),
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

    return NextResponse.json(updatedAcquisition);
  } catch (error) {
    console.error("Failed to update acquisition:", error);
    return NextResponse.json({ error: 'Failed to update acquisition' }, { status: 500 });
  }
}

// DELETE /api/acquisitions/[id] - Delete acquisition
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.acquisition.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Acquisition deleted successfully' });
  } catch (error) {
    console.error("Failed to delete acquisition:", error);
    return NextResponse.json({ error: 'Failed to delete acquisition' }, { status: 500 });
  }
}

