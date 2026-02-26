function getVitallyHeaders(): HeadersInit {
  return {
    Authorization: `Basic ${process.env.VITALLY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface VitallyAccount {
  name: string;
  externalId: string;
  accountId: string;
  traits: {
    arr?: number;
    ARR?: number;
    mrr?: number;
    MRR?: number;
    annualRecurringRevenue?: number;
    monthlyRecurringRevenue?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AccountSummary {
  name: string;
  arr: number;
  externalId: string;
  accountId: string;
}

/**
 * Fetch all Vitally accounts with pagination.
 * @param statusFilter  Pass "active" (default) to limit to active accounts, or undefined for all.
 */
export async function getAllAccounts(
  statusFilter: string | undefined = "active"
): Promise<VitallyAccount[]> {
  const accounts: VitallyAccount[] = [];
  let nextToken: string | undefined;

  while (true) {
    const params = new URLSearchParams({ limit: "100" });
    if (statusFilter) params.set("status", statusFilter);
    if (nextToken) params.set("from", nextToken);

    const url = `${process.env.VITALLY_BASE_URL}/accounts?${params}`;
    const response = await fetch(url, { headers: getVitallyHeaders() });

    if (!response.ok) {
      throw new Error(
        `Vitally getAllAccounts failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const results: VitallyAccount[] = data.results ?? [];
    accounts.push(...results);

    const atEnd: boolean = data.atEnd ?? true;
    nextToken = data.next;

    if (atEnd || !nextToken) break;
  }

  return accounts;
}

/**
 * Extract the ARR value from a Vitally account object.
 * Falls back to MRR × 12 if no ARR field is found.
 */
export function getArrFromAccount(account: VitallyAccount): number {
  const t = account.traits ?? {};
  const arr =
    t.arr ?? t.ARR ?? t.annualRecurringRevenue ?? (account as Record<string, unknown>).arr;

  if (arr != null && Number(arr) !== 0) return Number(arr);

  const mrr =
    t.mrr ??
    t.MRR ??
    t.monthlyRecurringRevenue ??
    (account as Record<string, unknown>).mrr ??
    0;

  return Number(mrr) * 12;
}

/**
 * Build a map of { externalId → ARR }.
 * externalId is the Salesforce ID — matches customfield_10737 in Jira.
 */
export function buildArrLookupByExternalId(
  accounts: VitallyAccount[]
): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const account of accounts) {
    const id = account.externalId ?? account.accountId;
    if (id) lookup[String(id)] = getArrFromAccount(account);
  }
  return lookup;
}

/**
 * Build a map of { externalId → AccountSummary } for richer lookups.
 */
export function buildAccountLookupByExternalId(
  accounts: VitallyAccount[]
): Record<string, AccountSummary> {
  const lookup: Record<string, AccountSummary> = {};
  for (const account of accounts) {
    const id = account.externalId ?? account.accountId;
    if (id) {
      lookup[String(id)] = {
        name: account.name,
        arr: getArrFromAccount(account),
        externalId: String(id),
        accountId: account.accountId,
      };
    }
  }
  return lookup;
}

/**
 * Build a map of { name → ARR }.
 */
export function buildArrLookupByName(
  accounts: VitallyAccount[]
): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const account of accounts) {
    if (account.name) lookup[account.name] = getArrFromAccount(account);
  }
  return lookup;
}
