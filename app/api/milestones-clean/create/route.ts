import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, date } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        date: new Date(date).toISOString(),
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
