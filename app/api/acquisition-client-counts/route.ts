import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/acquisition-client-counts - List all client count records
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const acquisitionId = searchParams.get('acquisitionId');

    const whereClause = acquisitionId ? { acquisitionId } : {};

    const clientCounts = await prisma.acquisitionClientCount.findMany({
      where: whereClause,
      include: {
        acquisition: true,
      },
      orderBy: { clientName: 'asc' },
    });
    return NextResponse.json(clientCounts);
  } catch (error) {
    console.error("Failed to fetch acquisition client counts:", error);
    return NextResponse.json({ error: 'Failed to fetch acquisition client counts' }, { status: 500 });
  }
}

// POST /api/acquisition-client-counts - Create a new client count record
export async function POST(request: Request) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.acquisitionId || !body.clientVitallyId || !body.clientName) {
      return NextResponse.json({ error: 'Missing required fields: acquisitionId, clientVitallyId, clientName' }, { status: 400 });
    }

    const newClientCount = await prisma.acquisitionClientCount.create({
      data: {
        acquisitionId: body.acquisitionId,
        clientVitallyId: body.clientVitallyId,
        orgId: body.orgId || null,
        clientName: body.clientName,
        activeInConsole: body.activeInConsole ?? false,
      },
      include: {
        acquisition: true,
      },
    });
    
    return NextResponse.json(newClientCount, { status: 201 });
  } catch (error) {
    console.error("Failed to create acquisition client count:", error);
    return NextResponse.json({ error: 'Failed to create acquisition client count' }, { status: 500 });
  }
}
