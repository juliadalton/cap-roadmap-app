import { NextResponse } from "next/server";
import { requireEditorSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/migrate-relevant-links
 *
 * One-time migration: converts any relevantLinks entries stored as plain strings
 * (legacy format) to { url, text? } objects (current format).
 *
 * Safe to run multiple times — only updates records that still contain strings.
 * Requires editor session.
 */
export async function POST() {
  const { error } = await requireEditorSession();
  if (error) return error;

  let itemsChecked = 0;
  let itemsMigrated = 0;
  let projectsChecked = 0;
  let projectsMigrated = 0;

  // --- Migrate RoadmapItem.relevantLinks ---
  const allItems = await prisma.roadmapItem.findMany({
    select: { id: true, relevantLinks: true },
  });

  for (const item of allItems) {
    itemsChecked++;
    const links = item.relevantLinks as unknown[];
    const hasStrings = links.some((l) => typeof l === "string");

    if (hasStrings) {
      const migrated = links.map((l) =>
        typeof l === "string" ? { url: l } : l
      );
      await prisma.roadmapItem.update({
        where: { id: item.id },
        data: { relevantLinks: { set: migrated as any } },
      });
      itemsMigrated++;
    }
  }

  // --- Migrate Project.relevantLinks ---
  const allProjects = await prisma.project.findMany({
    select: { id: true, relevantLinks: true },
  });

  for (const project of allProjects) {
    projectsChecked++;
    const links = project.relevantLinks as unknown[];
    const hasStrings = links.some((l) => typeof l === "string");

    if (hasStrings) {
      const migrated = links.map((l) =>
        typeof l === "string" ? { url: l } : l
      );
      await prisma.project.update({
        where: { id: project.id },
        data: { relevantLinks: { set: migrated as any } },
      });
      projectsMigrated++;
    }
  }

  return NextResponse.json({
    ok: true,
    roadmapItems: { checked: itemsChecked, migrated: itemsMigrated },
    projects: { checked: projectsChecked, migrated: projectsMigrated },
    message:
      itemsMigrated === 0 && projectsMigrated === 0
        ? "No legacy string-format links found — database is already clean."
        : `Migrated ${itemsMigrated} roadmap item(s) and ${projectsMigrated} project(s).`,
  });
}
