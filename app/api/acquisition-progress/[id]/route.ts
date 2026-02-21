import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/acquisition-progress/[id] - Get single progress record
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const progress = await prisma.acquisitionProgress.findUnique({
      where: { id },
      include: {
        acquisition: true,
      },
    });

    if (!progress) {
      return NextResponse.json({ error: 'Acquisition progress not found' }, { status: 404 });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Failed to fetch acquisition progress:", error);
    return NextResponse.json({ error: 'Failed to fetch acquisition progress' }, { status: 500 });
  }
}

// PATCH /api/acquisition-progress/[id] - Update progress record
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
    
    const updateData: any = {};
    
    if (body.disposition !== undefined) updateData.disposition = body.disposition;
    if (body.devPlatform !== undefined) updateData.devPlatform = body.devPlatform;
    if (body.functionalityEpicsToDo !== undefined) updateData.functionalityEpicsToDo = body.functionalityEpicsToDo;
    if (body.functionalityEpicsInProgress !== undefined) updateData.functionalityEpicsInProgress = body.functionalityEpicsInProgress;
    if (body.functionalityEpicsComplete !== undefined) updateData.functionalityEpicsComplete = body.functionalityEpicsComplete;
    if (body.clientCountTotal !== undefined) updateData.clientCountTotal = body.clientCountTotal;
    if (body.clientAccessCount !== undefined) updateData.clientAccessCount = body.clientAccessCount;
    if (body.clientActiveCount !== undefined) updateData.clientActiveCount = body.clientActiveCount;

    const updatedProgress = await prisma.acquisitionProgress.update({
      where: { id },
      data: updateData,
      include: {
        acquisition: true,
      },
    });

    return NextResponse.json(updatedProgress);
  } catch (error) {
    console.error("Failed to update acquisition progress:", error);
    return NextResponse.json({ error: 'Failed to update acquisition progress' }, { status: 500 });
  }
}

// DELETE /api/acquisition-progress/[id] - Delete progress record
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
    await prisma.acquisitionProgress.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Acquisition progress deleted successfully' });
  } catch (error) {
    console.error("Failed to delete acquisition progress:", error);
    return NextResponse.json({ error: 'Failed to delete acquisition progress' }, { status: 500 });
  }
}
