import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import type { RoadmapItem } from '@/types/roadmap';

// GET /api/roadmap/items/[id]
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  // Optional: Add auth check if needed for reading single items
  // const session = await getServerSession(authOptions);
  // if (!session) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  
  const params = await context.params;
  const id = params.id;
  try {
    const item = await prisma.roadmapItem.findUnique({
      where: { id },
      // Optionally include relations if needed when fetching a single item
      // include: { milestone: true, createdBy: true, updatedBy: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error(`Failed to fetch roadmap item ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch roadmap item' }, { status: 500 });
  }
}

// PATCH /api/roadmap/items/[id]
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await context.params;
  const id = params.id;
  try {
    const body = await request.json();
    const { title, description, date, category, status, milestoneId, pirateMetrics, northStarMetrics, relatedItemIds, relevantLinks, productDRI } = body;
    const userId = session.user.id; // Get user ID from session

    if (!id) {
      return NextResponse.json({ error: 'Roadmap item ID is missing' }, { status: 400 });
    }

    const currentItem = await prisma.roadmapItem.findUnique({ where: { id }});
    if (!currentItem) {
      return NextResponse.json({ error: 'RoadmapItem not found' }, { status: 404 });
    }

    const dataToUpdate: Prisma.RoadmapItemUpdateInput = {};

    const allowedUpdates: Prisma.RoadmapItemUpdateInput = {};
    const allowedScalarKeys = ['title', 'description', 'date', 'category', 'status', 'productDRI']; 

    for (const key of allowedScalarKeys) {
      if (body.hasOwnProperty(key)) {
        if (key === 'date' && body[key]) {
          allowedUpdates.date = new Date(body[key]!);
        } else if (key === 'description') {
          allowedUpdates.description = body.description;
        } else if (key === 'productDRI') {
          allowedUpdates.productDRI = body.productDRI || "";
        } else if (key !== 'date' && key !== 'description' && key !== 'productDRI') {
          (allowedUpdates as any)[key] = body[key as keyof typeof body];
        }
      }
    }

    if (body.hasOwnProperty('milestoneId') && body.milestoneId) {
       allowedUpdates.milestone = { connect: { id: body.milestoneId } };
    }

    // Use `set` for array updates
    if (body.hasOwnProperty('pirateMetrics')) {
      allowedUpdates.pirateMetrics = { set: body.pirateMetrics || [] };
    }
    if (body.hasOwnProperty('northStarMetrics')) {
      allowedUpdates.northStarMetrics = { set: body.northStarMetrics || [] };
    }
    if (relevantLinks) {
      allowedUpdates.relevantLinks = { set: relevantLinks };
    }
    
    if (body.hasOwnProperty('relatedItemIds')) {
      const relatedIds = body.relatedItemIds || [];
      allowedUpdates.relatedItems = {
          set: relatedIds.map((relatedId: string) => ({ id: relatedId }))
      };
    }

    allowedUpdates.updatedBy = { connect: { id: session.user.id } };

    console.log(`Attempting to update RoadmapItem ${id} with data:`, allowedUpdates);

    const updateKeys = Object.keys(allowedUpdates);
    if (updateKeys.length === 0 || (updateKeys.length === 1 && updateKeys[0] === 'updatedBy')) {
       return NextResponse.json({ error: 'No meaningful fields provided for update' }, { status: 400 });
    }
    
    const updatedItem = await prisma.roadmapItem.update({
      where: { id },
      data: allowedUpdates as any,
      include: {
          milestone: true,
          createdBy: { select: { name: true, id: true, image: true } },
          updatedBy: { select: { name: true, id: true, image: true } },
          relatedItems: { select: { id: true, title: true } },
          relatedTo: { select: { id: true, title: true } }
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error(`Detailed error updating roadmap item ${id}:`, error);
    let errorMessage = 'Failed to update roadmap item';
    let statusCode = 500;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       if (error.code === 'P2003') { 
         errorMessage = `Foreign key constraint failed on the field: ${error.meta?.field_name}`;
         statusCode = 400;
       } else if (error.code === 'P2025') { 
         errorMessage = 'Roadmap item not found';
         statusCode = 404;
       } else {
        errorMessage = `Prisma Error (${error.code}): Failed to update item.`;
       }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

// DELETE /api/roadmap/items/[id]
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // We have the user ID, but it's not directly needed for delete
  const params = await context.params;
  const id = params.id;
  
  try {
    // console.log(`Attempting to delete RoadmapItem ${id} by user ${session.user.id}`);

    await prisma.roadmapItem.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`Detailed error deleting roadmap item ${id}:`, error);
    let errorMessage = 'Failed to delete roadmap item';
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       if (error.code === 'P2025') { // Record to delete not found
         errorMessage = 'Roadmap item not found';
         statusCode = 404;
       } else {
         errorMessage = `Prisma Error (${error.code}): Failed to delete item.`;
       }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
} 