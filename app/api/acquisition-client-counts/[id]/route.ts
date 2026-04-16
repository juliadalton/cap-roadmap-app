import { NextResponse } from 'next/server';
import { requireEditorSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/acquisition-client-counts/[id] - Get single client count record
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientCount = await prisma.acquisitionClientCount.findUnique({
      where: { id },
      include: {
        acquisition: true,
      },
    });

    if (!clientCount) {
      return NextResponse.json({ error: 'Acquisition client count not found' }, { status: 404 });
    }

    return NextResponse.json(clientCount);
  } catch (error) {
    console.error("Failed to fetch acquisition client count:", error);
    return NextResponse.json({ error: 'Failed to fetch acquisition client count' }, { status: 500 });
  }
}

// PATCH /api/acquisition-client-counts/[id] - Update client count record
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireEditorSession();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    
    const updateData: any = {};
    
    if (body.clientVitallyId !== undefined) updateData.clientVitallyId = body.clientVitallyId;
    if (body.orgId !== undefined) updateData.orgId = body.orgId;
    if (body.clientName !== undefined) updateData.clientName = body.clientName;
    if (body.activeInConsole !== undefined) updateData.activeInConsole = body.activeInConsole;

    const updatedClientCount = await prisma.acquisitionClientCount.update({
      where: { id },
      data: updateData,
      include: {
        acquisition: true,
      },
    });

    return NextResponse.json(updatedClientCount);
  } catch (error) {
    console.error("Failed to update acquisition client count:", error);
    return NextResponse.json({ error: 'Failed to update acquisition client count' }, { status: 500 });
  }
}

// DELETE /api/acquisition-client-counts/[id] - Delete client count record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireEditorSession();
    if (error) return error;

    const { id } = await params;
    await prisma.acquisitionClientCount.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete acquisition client count:", error);
    return NextResponse.json({ error: 'Failed to delete acquisition client count' }, { status: 500 });
  }
}
