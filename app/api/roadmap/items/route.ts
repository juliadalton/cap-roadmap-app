import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { RoadmapItem } from '@/types/roadmap'; // Assuming your type definition path
import { Prisma } from '@prisma/client'; // Import Prisma types for error checking
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth'; // Import from new location
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Added detailed check for editor role
  if (!session?.user || !userId || session.user.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    // Explicitly type body for clarity
    const { title, description, date, category, status, milestoneId, pirateMetrics, northStarMetrics, relatedItemIds, relevantLinks, productDRI } = body as {
        title: string;
        description?: string | null;
        date: string;
        category: string;
        status: string;
        milestoneId: string;
        pirateMetrics?: string[] | null;
        northStarMetrics?: string[] | null;
        relatedItemIds?: string[] | null; // Added type for relatedItemIds
        relevantLinks?: string[] | null;
        productDRI?: string | null;
    };

    if (!title || !category || !status || !milestoneId || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Create the item without relations
    const dataToCreate = {
        title,
        description: description,
        date: new Date(date),
        category,
        status,
        milestone: { connect: { id: milestoneId } },
        createdBy: { connect: { id: userId } },
        updatedBy: { connect: { id: userId } },
        pirateMetrics: { set: pirateMetrics || [] },
        northStarMetrics: { set: northStarMetrics || [] },
        relevantLinks: { set: relevantLinks || [] },
        productDRI: productDRI || "",
        // Omit relatedItems here
    };
    
    const newItem = await prisma.roadmapItem.create({
        data: dataToCreate,
    });

    // Step 2: Update the newly created item to add relations if IDs exist
    let finalItem = newItem;
    if (relatedItemIds && relatedItemIds.length > 0) {
        finalItem = await prisma.roadmapItem.update({
            where: { id: newItem.id },
            data: {
                relatedItems: { 
                    connect: relatedItemIds.map((id: string) => ({ id })) 
                }
            },
            // Include related items in the final response
            include: { relatedItems: { select: { id: true, title: true } } }
        });
    }

    return NextResponse.json(finalItem, { status: 201 });

  } catch (error) {
    // More specific error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Example: Handle foreign key constraint failure (e.g., invalid milestoneId)
      if (error.code === 'P2003' || error.code === 'P2025') {
        return NextResponse.json({ error: 'Invalid Milestone ID or User ID provided.' }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Failed to create roadmap item' }, { status: 500 });
  }
}

// Optional: Add a GET handler to fetch items
export async function GET(request: Request) {
    try {
        const items = await prisma.roadmapItem.findMany({
            orderBy: { createdAt: 'asc' },
            include: {
                milestone: true,
                createdBy: { select: { id: true, name: true, image: true } },
                updatedBy: { select: { id: true, name: true, image: true } },
                // Include related item IDs and titles
                relatedItems: { select: { id: true, title: true } },
                relatedTo: { select: { id: true, title: true } }
            }
        });
        return NextResponse.json(items);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch roadmap items' }, { status: 500 });
    }
} 