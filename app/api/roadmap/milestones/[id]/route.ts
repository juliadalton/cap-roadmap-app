import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/roadmap/milestones/[id] (Optional: If needed)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    const milestone = await prisma.milestone.findUnique({ where: { id } });
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    return NextResponse.json(milestone);
  } catch (error) {
    console.error(`Failed to fetch milestone ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch milestone' }, { status: 500 });
  }
}

// PATCH /api/roadmap/milestones/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const id = params.id;
  try {
    const body = await request.json();
    const allowedUpdates: Prisma.MilestoneUpdateInput = {};

    if (body.hasOwnProperty('title') && body.title) {
      allowedUpdates.title = body.title;
    }
    if (body.hasOwnProperty('date')) {
      const date = new Date(body.date);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      allowedUpdates.date = date;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update (title, date)' }, { status: 400 });
    }

    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: allowedUpdates,
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error(`Failed to update milestone ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
}

// DELETE /api/roadmap/milestones/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const id = params.id;
  try {
    // Check if any RoadmapItems are associated with this milestone
    const itemCount = await prisma.roadmapItem.count({
      where: { milestoneId: id },
    });

    if (itemCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete milestone with associated roadmap items.' },
        { status: 400 } // Bad request
      );
    }

    // If no associated items, proceed with deletion
    await prisma.milestone.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error) {
    console.error(`Failed to delete milestone ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
} 