import prisma from "@/lib/prisma";

const CORE_API_URL =
  "https://core-api.aisoftware.com/v3/rpc/data_metrics/org_summary";

// A client is "meaningfully active" if 2+ usage columns have a value > 1
const MEANINGFUL_THRESHOLD = 1;
const MEANINGFUL_COLUMN_COUNT = 2;

export interface UsageSyncResult {
  clientsMatched: number;
  clientsActivated: number;    // flipped activeInConsole → true
  clientsDeactivated: number;  // flipped activeInConsole → false
  progressRecordsUpdated: number;
  errors: string[];
  durationMs: number;
}

interface CoreApiRecord {
  org_id: string | number;
  org_name?: string;
  org_status?: string;
  is_active?: boolean;
  report_month?: string;
  total_active_users?: number;
  total_auth_active_users?: number;
  total_automations?: number;
  total_conversations?: number;
  total_inquiries?: number;
  total_tickets?: number;
  total_voice_minutes?: number;
  total_workflows?: number;
}

// Normalize the various response shapes Core API may return
function extractRecords(data: unknown): CoreApiRecord[] {
  if (Array.isArray(data)) return data as CoreApiRecord[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.results)) return d.results as CoreApiRecord[];
    if (Array.isArray(d.data)) return d.data as CoreApiRecord[];
    if (d.data && typeof d.data === "object") {
      const inner = d.data as Record<string, unknown>;
      if (Array.isArray(inner.results)) return inner.results as CoreApiRecord[];
    }
  }
  return [];
}

// For each org, keep only the most-recent month's record
function latestPerOrg(records: CoreApiRecord[]): Map<string, CoreApiRecord> {
  const map = new Map<string, CoreApiRecord>();
  for (const r of records) {
    const orgId = String(r.org_id);
    if (!orgId || orgId === "undefined") continue;
    const existing = map.get(orgId);
    if (!existing || (r.report_month ?? "") > (existing.report_month ?? "")) {
      map.set(orgId, r);
    }
  }
  return map;
}

function buildUsageFlags(r: CoreApiRecord): {
  usageActiveUsers: boolean;
  usageAuthActiveUsers: boolean;
  usageAutomations: boolean;
  usageConversations: boolean;
  usageInquiries: boolean;
  usageTickets: boolean;
  usageVoiceMinutes: boolean;
  usageWorkflows: boolean;
  activeInConsole: boolean;
} {
  const usageActiveUsers     = (r.total_active_users     ?? 0) > MEANINGFUL_THRESHOLD;
  const usageAuthActiveUsers = (r.total_auth_active_users ?? 0) > MEANINGFUL_THRESHOLD;
  const usageAutomations     = (r.total_automations      ?? 0) > MEANINGFUL_THRESHOLD;
  const usageConversations   = (r.total_conversations    ?? 0) > MEANINGFUL_THRESHOLD;
  const usageInquiries       = (r.total_inquiries        ?? 0) > MEANINGFUL_THRESHOLD;
  const usageTickets         = (r.total_tickets          ?? 0) > MEANINGFUL_THRESHOLD;
  const usageVoiceMinutes    = (r.total_voice_minutes    ?? 0) > MEANINGFUL_THRESHOLD;
  const usageWorkflows       = (r.total_workflows        ?? 0) > MEANINGFUL_THRESHOLD;

  const trueCount = [
    usageActiveUsers, usageAuthActiveUsers, usageAutomations,
    usageConversations, usageInquiries, usageTickets,
    usageVoiceMinutes, usageWorkflows,
  ].filter(Boolean).length;

  const activeInConsole = trueCount >= MEANINGFUL_COLUMN_COUNT;

  return {
    usageActiveUsers,
    usageAuthActiveUsers,
    usageAutomations,
    usageConversations,
    usageInquiries,
    usageTickets,
    usageVoiceMinutes,
    usageWorkflows,
    activeInConsole,
  };
}

export async function runUsageSync(bearerToken: string): Promise<UsageSyncResult> {
  const start = Date.now();
  const result: UsageSyncResult = {
    clientsMatched: 0,
    clientsActivated: 0,
    clientsDeactivated: 0,
    progressRecordsUpdated: 0,
    errors: [],
    durationMs: 0,
  };

  // ── 1. Fetch from Core API ────────────────────────────────────────────────
  let usageByOrgId: Map<string, CoreApiRecord>;
  try {
    const response = await fetch(CORE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ num_months: 1 }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Core API ${response.status}: ${text}`);
    }

    const data = await response.json();
    const records = extractRecords(data);
    usageByOrgId = latestPerOrg(records);
  } catch (err) {
    result.errors.push(
      `Core API fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
    result.durationMs = Date.now() - start;
    return result;
  }

  // ── 2. Load all non-churned clients that have an orgId ───────────────────
  const clients = await prisma.acquisitionClientCount.findMany({
    where: { churned: false, orgId: { not: null } },
    select: {
      id: true,
      orgId: true,
      acquisitionId: true,
      activeInConsole: true,
    },
  });

  // ── 3. Update each matched client ────────────────────────────────────────
  const touchedAcquisitionIds = new Set<string>();

  for (const client of clients) {
    const record = usageByOrgId.get(client.orgId!);
    if (!record) continue;

    result.clientsMatched++;
    const flags = buildUsageFlags(record);

    try {
      await prisma.acquisitionClientCount.update({
        where: { id: client.id },
        data: {
          ...flags,
          usageSyncedAt: new Date(),
        },
      });

      if (flags.activeInConsole && !client.activeInConsole) result.clientsActivated++;
      if (!flags.activeInConsole && client.activeInConsole) result.clientsDeactivated++;

      touchedAcquisitionIds.add(client.acquisitionId);
    } catch (err) {
      result.errors.push(
        `Client ${client.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── 4. Roll up clientActiveCount on AcquisitionProgress ──────────────────
  const acquisitions = await prisma.acquisition.findMany({
    where: { id: { in: [...touchedAcquisitionIds] } },
    select: { id: true, progress: { select: { id: true, manualSync: true, clientMetricsApplicable: true } } },
  });

  for (const acq of acquisitions) {
    if (!acq.progress || acq.progress.manualSync) continue;
    if (acq.progress.clientMetricsApplicable === false) continue;

    try {
      const activeCount = await prisma.acquisitionClientCount.count({
        where: { acquisitionId: acq.id, churned: false, activeInConsole: true },
      });

      await prisma.acquisitionProgress.update({
        where: { acquisitionId: acq.id },
        data: { clientActiveCount: activeCount },
      });

      result.progressRecordsUpdated++;
    } catch (err) {
      result.errors.push(
        `Progress update ${acq.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}
