import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(
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
    const body = await request.json();
    const { title, date } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

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

    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: {
        title,
        date: new Date(date).toISOString(),
      },
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
