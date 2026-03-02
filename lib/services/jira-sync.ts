import prisma from "@/lib/prisma";
import { getAcquisitionEpics, extractAcquiredCompanies } from "@/lib/services/jira";

/**
 * Maps Jira "Acquired Company" field values (lowercase) to the canonical
 * acquisition name used in the platform DB. Add entries here whenever a
 * Jira company name doesn't match the acquisition name exactly.
 */
const JIRA_COMPANY_ALIASES: Record<string, string> = {
  ycbm: "YouCanBookMe",
  denim: "Denim Social",
  lucy: "Answer Engine",
};

// Status → AcquisitionProgress bucket mappings
const TODO_STATUSES = new Set([
  "To Do",
  "Building Requirements",
  "Ready for Ticketing",
  "Ready for Development",
]);
const IN_PROGRESS_STATUSES = new Set(["In Development"]);
const COMPLETE_STATUSES = new Set(["Closed", "Done"]);

export interface JiraSyncResult {
  dryRun: boolean;
  epicsProcessed: number;
  epicsUpserted: number;
  epicsRemoved: number;
  acquisitionsUpdated: string[];
  progressRecordsUpdated: number;
  unmatchedCompanyNames: string[];
  /** dry-run only: rows that would be upserted */
  preview?: Array<{ epicId: string; epicName: string; acquisitionId: string; epicAcquiredCompany: string; epicStatus: string }>;
  errors: string[];
}

/**
 * Full Jira → FunctionalityEpic sync.
 *
 * For each Epic in PROJ with Acquired Company populated (created >= 2024):
 *  - Creates one FunctionalityEpic row per (epic × acquisition) pairing
 *  - Upserts so projectId set manually is preserved across runs
 *  - Removes stale rows for epics no longer returned by Jira
 *  - Updates AcquisitionProgress epic counts for non-manual acquisitions
 */
export async function runJiraSync(dryRun = false): Promise<JiraSyncResult> {
  const result: JiraSyncResult = {
    dryRun,
    epicsProcessed: 0,
    epicsUpserted: 0,
    epicsRemoved: 0,
    acquisitionsUpdated: [],
    progressRecordsUpdated: 0,
    unmatchedCompanyNames: [],
    ...(dryRun ? { preview: [] } : {}),
    errors: [],
  };

  const unmatchedNames = new Set<string>();

  // ── 1. Load all acquisitions ─────────────────────────────────────────────
  const acquisitions = await prisma.acquisition.findMany({
    include: { progress: true },
  });

  // Case-insensitive name lookup, excluding manual-sync acquisitions
  const acquisitionByName = new Map(
    acquisitions
      .filter((a) => !a.progress?.manualSync)
      .map((a) => [a.name.toLowerCase(), a])
  );

  // ── 2. Fetch acquisition epics from Jira ─────────────────────────────────
  const epics = await getAcquisitionEpics();
  result.epicsProcessed = epics.length;

  // ── 3. Build fresh (epicId × acquisitionId) set ──────────────────────────
  // freshPairs: acquisitionId → Set<epicId>
  const freshPairs = new Map<string, Set<string>>();

  // epicUpserts: list of rows to upsert
  const epicUpserts: Array<{
    epicId: string;
    acquisitionId: string;
    epicName: string;
    epicStatus: string;
    epicAcquiredCompany: string;
    epicLink: string;
  }> = [];

  for (const epic of epics) {
    const fields = epic.fields as Record<string, unknown>;
    const companies = extractAcquiredCompanies(epic);
    const epicName = String(fields.summary ?? "");
    const epicStatus =
      typeof fields.status === "object" && fields.status !== null
        ? String((fields.status as Record<string, unknown>).name ?? "")
        : "";
    const epicLink = `${process.env.JIRA_BASE_URL}/browse/${epic.key}`;

    for (const company of companies) {
      const lowerCompany = company.toLowerCase();
      const resolvedName = JIRA_COMPANY_ALIASES[lowerCompany] ?? company;
      const acquisition = acquisitionByName.get(resolvedName.toLowerCase());
      if (!acquisition) {
        unmatchedNames.add(company);
        continue;
      }

      if (!freshPairs.has(acquisition.id)) {
        freshPairs.set(acquisition.id, new Set());
      }
      freshPairs.get(acquisition.id)!.add(epic.key);

      epicUpserts.push({
        epicId: epic.key,
        acquisitionId: acquisition.id,
        epicName,
        epicStatus,
        epicAcquiredCompany: company,
        epicLink,
      });
    }
  }

  // ── 4. Upsert fresh epic records (skipped in dry run) ────────────────────
  if (dryRun) {
    result.preview = epicUpserts.map(({ epicId, epicName, acquisitionId, epicAcquiredCompany, epicStatus }) => ({
      epicId, epicName, acquisitionId, epicAcquiredCompany, epicStatus,
    }));
    result.epicsUpserted = epicUpserts.length;
  } else {
    for (const row of epicUpserts) {
      try {
        await prisma.functionalityEpic.upsert({
          where: {
            epicId_acquisitionId: {
              epicId: row.epicId,
              acquisitionId: row.acquisitionId,
            },
          },
          update: {
            epicName: row.epicName,
            epicStatus: row.epicStatus,
            epicAcquiredCompany: row.epicAcquiredCompany,
            epicLink: row.epicLink,
            // projectId intentionally omitted — preserved from prior manual set
          },
          create: {
            epicId: row.epicId,
            acquisitionId: row.acquisitionId,
            epicName: row.epicName,
            epicStatus: row.epicStatus,
            epicAcquiredCompany: row.epicAcquiredCompany,
            epicLink: row.epicLink,
          },
        });
        result.epicsUpserted++;
      } catch (err) {
        result.errors.push(
          `Upsert ${row.epicId}/${row.acquisitionId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // ── 5. Remove stale epic rows for each touched acquisition ─────────────
    for (const [acquisitionId, currentEpicIds] of freshPairs) {
      try {
        const deleted = await prisma.functionalityEpic.deleteMany({
          where: {
            acquisitionId,
            epicId: { notIn: [...currentEpicIds] },
          },
        });
        result.epicsRemoved += deleted.count;
        result.acquisitionsUpdated.push(acquisitionId);
      } catch (err) {
        result.errors.push(
          `Cleanup ${acquisitionId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  result.unmatchedCompanyNames = [...unmatchedNames].sort();

  // ── 6. Update AcquisitionProgress epic counts (skipped in dry run) ───────
  if (dryRun) return result;

  for (const acquisition of acquisitions) {
    if (!acquisition.progress) continue;
    if (acquisition.progress.manualSync) continue;

    try {
      const epicsForAcq = await prisma.functionalityEpic.findMany({
        where: { acquisitionId: acquisition.id },
        select: { epicStatus: true },
      });

      let toDo = 0;
      let inProgress = 0;
      let complete = 0;

      for (const { epicStatus } of epicsForAcq) {
        const status = epicStatus ?? "";
        if (TODO_STATUSES.has(status)) toDo++;
        else if (IN_PROGRESS_STATUSES.has(status)) inProgress++;
        else if (COMPLETE_STATUSES.has(status)) complete++;
      }

      await prisma.acquisitionProgress.update({
        where: { acquisitionId: acquisition.id },
        data: {
          functionalityEpicsToDo: toDo,
          functionalityEpicsInProgress: inProgress,
          functionalityEpicsComplete: complete,
        },
      });

      result.progressRecordsUpdated++;
    } catch (err) {
      result.errors.push(
        `Progress update ${acquisition.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
