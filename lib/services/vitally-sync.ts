import prisma from "@/lib/prisma";
import { getAllAccounts } from "@/lib/services/vitally";

/**
 * Regex that matches Vitally trait keys of the form:
 *   sfdc.{AcquisitionName}_ARR_Rollup__c
 * Capture group 1 → the acquisition name portion.
 */
const ARR_FIELD_RE = /^sfdc\.(.+?)_ARR/i;

/**
 * Maps Vitally field name variants (lowercase) to the canonical acquisition
 * name used in the platform DB. Add entries here whenever a Vitally field
 * name doesn't match the acquisition name exactly.
 */
const VITALLY_NAME_ALIASES: Record<string, string> = {
  lucy: "Answer Engine",
};

export interface SyncResult {
  accountsProcessed: number;
  acquisitionsUpdated: string[];
  clientsUpserted: number;
  clientsMarkedChurned: number;
  progressRecordsUpdated: number;
  errors: string[];
  orgIdSample: Array<{ clientName: string; rawValue: unknown; rawType: string; savedAs: string | null }>;
}

/**
 * Full Vitally → AcquisitionClientCount sync.
 *
 * For each Vitally account:
 *  - Scans traits for keys matching sfdc.{Name}_ARR*
 *  - If value > 0, links that client to the matching Acquisition
 *
 * After collecting all fresh data:
 *  - Upserts client rows (churned = false)
 *  - Marks previously-seen clients no longer present as churned = true
 *  - Updates AcquisitionProgress.clientCountTotal for non-manual acquisitions
 */
export async function runVitallySync(): Promise<SyncResult> {
  const result: SyncResult = {
    accountsProcessed: 0,
    acquisitionsUpdated: [],
    clientsUpserted: 0,
    clientsMarkedChurned: 0,
    progressRecordsUpdated: 0,
    errors: [],
    orgIdSample: [],
  };

  // ── 1. Load all acquisitions ─────────────────────────────────────────────
  const acquisitions = await prisma.acquisition.findMany({
    include: { progress: true },
  });

  // Case-insensitive name → acquisition lookup
  const acquisitionByName = new Map(
    acquisitions.map((a) => [a.name.toLowerCase(), a])
  );

  // ── 2. Fetch all Vitally accounts ─────────────────────────────────────────
  // Pass undefined to retrieve all accounts regardless of status so we can
  // determine activity purely from ARR value.
  const accounts = await getAllAccounts(undefined);
  result.accountsProcessed = accounts.length;

  // ── 3. Build fresh client map: acquisitionId → client records ────────────
  // Use a Map<acquisitionId, Map<clientVitallyId, clientData>> to deduplicate
  // in case a single account matches multiple ARR fields for the same acquisition.
  const freshByAcquisition = new Map<
    string,
    Map<
      string,
      { clientName: string; clientVitallyId: string; orgId: string | null }
    >
  >();

  for (const account of accounts) {
    if (!account.externalId) continue;

    const traits = (account.traits ?? {}) as Record<string, unknown>;
    const rawOrgId = traits["sfdc.Capacity_Org_ID__c"];
    const orgId =
      typeof rawOrgId === "string"
        ? rawOrgId
        : typeof rawOrgId === "number"
        ? String(rawOrgId)
        : null;

    // Capture a sample of the first 20 accounts that have any value in this field
    if (rawOrgId !== undefined && rawOrgId !== null && result.orgIdSample.length < 20) {
      result.orgIdSample.push({
        clientName: account.name,
        rawValue: rawOrgId,
        rawType: typeof rawOrgId,
        savedAs: orgId,
      });
    }

    for (const [key, value] of Object.entries(traits)) {
      const match = ARR_FIELD_RE.exec(key);
      if (!match) continue;

      const numValue = Number(value);
      if (!numValue || numValue <= 0) continue;

      const extractedName = match[1]; // e.g. "SmartAction"
      const lowerExtracted = extractedName.toLowerCase();
      // Resolve alias first, then fall back to direct name match
      const resolvedName = VITALLY_NAME_ALIASES[lowerExtracted] ?? extractedName;
      const acquisition = acquisitionByName.get(resolvedName.toLowerCase());
      if (!acquisition) continue;

      if (!freshByAcquisition.has(acquisition.id)) {
        freshByAcquisition.set(acquisition.id, new Map());
      }

      // Last write wins — deduplicates multiple matching fields for same acq
      freshByAcquisition.get(acquisition.id)!.set(account.externalId, {
        clientName: account.name,
        clientVitallyId: account.externalId,
        orgId,
      });
    }
  }

  // ── 4. Persist changes per acquisition ───────────────────────────────────
  for (const [acquisitionId, clientMap] of freshByAcquisition) {
    const freshIds = [...clientMap.keys()];

    try {
      // Mark clients no longer present as churned
      const churned = await prisma.acquisitionClientCount.updateMany({
        where: {
          acquisitionId,
          clientVitallyId: { notIn: freshIds },
          churned: false,
        },
        data: { churned: true },
      });
      result.clientsMarkedChurned += churned.count;

      // Upsert each fresh client
      for (const client of clientMap.values()) {
        await prisma.acquisitionClientCount.upsert({
          where: {
            acquisitionId_clientVitallyId: {
              acquisitionId,
              clientVitallyId: client.clientVitallyId,
            },
          },
          update: {
            clientName: client.clientName,
            orgId: client.orgId,
            churned: false,
          },
          create: {
            acquisitionId,
            clientVitallyId: client.clientVitallyId,
            clientName: client.clientName,
            orgId: client.orgId,
            churned: false,
          },
        });
        result.clientsUpserted++;
      }

      result.acquisitionsUpdated.push(acquisitionId);
    } catch (err) {
      result.errors.push(
        `Acquisition ${acquisitionId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── 5. Churn clients for acquisitions that had records but got zero hits ──
  // Find acquisitions with live (non-churned) clients that we never touched.
  const liveAcquisitionIds = await prisma.acquisitionClientCount.findMany({
    where: { churned: false },
    select: { acquisitionId: true },
    distinct: ["acquisitionId"],
  });

  const touchedIds = new Set(freshByAcquisition.keys());
  for (const { acquisitionId } of liveAcquisitionIds) {
    if (!touchedIds.has(acquisitionId)) {
      const churned = await prisma.acquisitionClientCount.updateMany({
        where: { acquisitionId, churned: false },
        data: { churned: true },
      });
      result.clientsMarkedChurned += churned.count;
    }
  }

  // ── 6. Update AcquisitionProgress counts for non-manual acquisitions ─────
  // clientCountTotal  = all non-churned clients
  // clientAccessCount = non-churned clients that have an orgId (console access)
  for (const acquisition of acquisitions) {
    if (!acquisition.progress) continue;
    if (acquisition.progress.manualSync) continue;
    if (acquisition.progress.clientMetricsApplicable === false) continue;

    try {
      const [liveCount, accessCount] = await Promise.all([
        prisma.acquisitionClientCount.count({
          where: { acquisitionId: acquisition.id, churned: false },
        }),
        prisma.acquisitionClientCount.count({
          where: {
            acquisitionId: acquisition.id,
            churned: false,
            orgId: { not: null },
          },
        }),
      ]);

      await prisma.acquisitionProgress.update({
        where: { acquisitionId: acquisition.id },
        data: {
          clientCountTotal: liveCount,
          clientAccessCount: accessCount,
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
