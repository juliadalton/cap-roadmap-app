// scripts/export-items.js 
// (You might need to adjust path to prisma client if not using the default)
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const prisma = new PrismaClient();

async function exportRoadmapItems() {
  console.log('Fetching roadmap items...');
  try {
    const items = await prisma.roadmapItem.findMany({
      // Include related data if needed in the export
      include: {
        milestone: { select: { title: true, date: true } },
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
        relatedItems: { select: { id: true, title: true } },
        relatedTo: { select: { id: true, title: true } },
      },
      orderBy: { // Optional: Sort the output
        milestone: {
          date: 'asc',
        }
      }
    });
    console.log(`Fetched ${items.length} items.`);

    const filePath = path.join(__dirname, 'roadmap-export.json'); // Output file in the same directory
    // Use null, 2 for pretty-printing JSON
    await fs.writeFile(filePath, JSON.stringify(items, null, 2)); 

    console.log(`Successfully exported items to ${filePath}`);

  } catch (error) {
    console.error('Error exporting roadmap items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportRoadmapItems(); 