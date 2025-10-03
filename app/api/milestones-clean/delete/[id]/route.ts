import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const { id } = params;

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!existingMilestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Check if there are any roadmap items associated with this milestone
    const associatedItems = await prisma.roadmapItem.findMany({
      where: { milestoneId: id },
      select: { id: true },
    });

    if (associatedItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete milestone with associated roadmap items' },
        { status: 400 }
      );
    }

    await prisma.milestone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
