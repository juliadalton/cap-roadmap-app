-- AlterTable
ALTER TABLE "RoadmapItem" ADD COLUMN     "relevantLinks" TEXT[] DEFAULT ARRAY[]::TEXT[];
