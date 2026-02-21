import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/functionality-epics/[id] - Get single epic
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const epic = await prisma.functionalityEpic.findUnique({
      where: { id },
      include: {
        acquisition: true,
      },
    });

    if (!epic) {
      return NextResponse.json({ error: 'Functionality epic not found' }, { status: 404 });
    }

    return NextResponse.json(epic);
  } catch (error) {
    console.error("Failed to fetch functionality epic:", error);
    return NextResponse.json({ error: 'Failed to fetch functionality epic' }, { status: 500 });
  }
}

// PATCH /api/functionality-epics/[id] - Update epic
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
    
    if (body.epicId !== undefined) updateData.epicId = body.epicId;
    if (body.epicName !== undefined) updateData.epicName = body.epicName;
    if (body.epicStatus !== undefined) updateData.epicStatus = body.epicStatus;
    if (body.epicAcquiredCompany !== undefined) updateData.epicAcquiredCompany = body.epicAcquiredCompany;
    if (body.epicLink !== undefined) updateData.epicLink = body.epicLink;

    const updatedEpic = await prisma.functionalityEpic.update({
      where: { id },
      data: updateData,
      include: {
        acquisition: true,
      },
    });

    return NextResponse.json(updatedEpic);
  } catch (error) {
    console.error("Failed to update functionality epic:", error);
    return NextResponse.json({ error: 'Failed to update functionality epic' }, { status: 500 });
  }
}

// DELETE /api/functionality-epics/[id] - Delete epic
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
    await prisma.functionalityEpic.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Functionality epic deleted successfully' });
  } catch (error) {
    console.error("Failed to delete functionality epic:", error);
    return NextResponse.json({ error: 'Failed to delete functionality epic' }, { status: 500 });
  }
}
