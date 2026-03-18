import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/acquisitions/[id] - Get single acquisition with projects
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const acquisition = await prisma.acquisition.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    const updatedAcquisition = await prisma.acquisition.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.integrationOverview !== undefined && { integrationOverview: body.integrationOverview }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.disposition !== undefined && {
          progress: {
            upsert: {
              update: { disposition: body.disposition || null },
              create: { disposition: body.disposition || null },
            },
          },
        }),
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

    return NextResponse.json(updatedAcquisition);
  } catch (error) {
    console.error("Failed to update acquisition:", error);
    return NextResponse.json({ error: 'Failed to update acquisition' }, { status: 500 });
  }
}

// DELETE /api/acquisitions/[id] - Delete acquisition
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.acquisition.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete acquisition:", error);
    return NextResponse.json({ error: 'Failed to delete acquisition' }, { status: 500 });
  }
}
