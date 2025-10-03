import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/roadmap/milestones
export async function GET(request: Request) {
  // Public access allowed for now
  try {
    const milestones = await prisma.milestone.findMany({
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(milestones);
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}

// POST /api/roadmap/milestones
export async function POST(request: Request) {
  try {
    // Import auth dependencies only when needed
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // userId not directly stored on Milestone, but check ensures only editors create

    const body = await request.json();
    if (!body.title || !body.date) {
      return NextResponse.json({ error: 'Missing required fields (title, date)' }, { status: 400 });
    }
    const date = new Date(body.date);
    if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const newMilestone = await prisma.milestone.create({
      data: { title: body.title, date: date },
    });
    return NextResponse.json(newMilestone, { status: 201 });
  } catch (error) {
    console.error("Failed to create milestone:", error);
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}

// The TODO for PUT/DELETE handlers is removed as they exist in the [id]/route.ts file. 