function getJiraHeaders(): HeadersInit {
  const authString = `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`;
  const base64 = Buffer.from(authString, "ascii").toString("base64");
  return {
    Authorization: `Basic ${base64}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function baseUrl() { return process.env.JIRA_BASE_URL!; }
function projectKey() { return process.env.JIRA_PROJECT_KEY ?? "PROJ"; }

export interface JiraIssue {
  id: string;
  key: string;
  fields: Record<string, unknown>;
}

/**
 * Fetch all open PRP issues using token-based pagination.
 * Excludes Completed / Won't Do statuses and Build issue type.
 */
export async function getAllOpenRequests(maxTotal = 500): Promise<JiraIssue[]> {
  const jql = `project = ${projectKey()} AND status NOT IN (Completed, "Won't Do") AND issuetype != "Build" ORDER BY created DESC`;
  const fields =
    "id,summary,customfield_10737,customfield_10523,customfield_10805,customfield_11596,priority,updated,created,assignee,status,customfield_11563,issuetype";
  const url = `${baseUrl()}/rest/api/3/search/jql`;
  const headers = getJiraHeaders();

  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      jql,
      maxResults: "100",
      fields,
      ...(nextPageToken ? { nextPageToken } : {}),
    });

    const response = await fetch(`${url}?${params}`, { headers });
    if (!response.ok) {
      throw new Error(`Jira search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const issues: JiraIssue[] = data.issues ?? [];
    allIssues.push(...issues);

    const isLast: boolean = data.isLast ?? false;
    nextPageToken = data.nextPageToken;

    if (issues.length === 0 || isLast || !nextPageToken || allIssues.length >= maxTotal) break;
  }

  return allIssues;
}

/**
 * Fetch issues updated within the last `days` days.
 * Includes changelog expansion for change detection.
 */
export async function getRecentlyUpdatedRequests(
  maxResults = 50,
  days = 1
): Promise<JiraIssue[]> {
  const jql = `project = ${projectKey()} AND updated >= -${days}d AND issuetype != "Build" ORDER BY created DESC`;
  const fields =
    "id,summary,customfield_10737,customfield_10523,customfield_10805,customfield_11596,priority,updated,created,status,statuscategorychangedate,issuetype";
  const url = `${baseUrl()}/rest/api/3/search/jql`;

  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields,
    expand: "changelog",
  });

  const response = await fetch(`${url}?${params}`, { headers: getJiraHeaders() });
  if (!response.ok) {
    throw new Error(`Jira search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.issues ?? [];
}

/**
 * Get a single issue by key (e.g. "PRP-123").
 */
export async function getIssue(issueKey: string): Promise<JiraIssue> {
  const url = `${baseUrl()}/rest/api/3/issue/${issueKey}`;
  const response = await fetch(url, { headers: getJiraHeaders() });
  if (!response.ok) {
    throw new Error(`Jira getIssue failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Update an arbitrary set of fields on an issue.
 */
export async function updateIssueFields(
  issueKey: string,
  fields: Record<string, unknown>
): Promise<void> {
  const url = `${baseUrl()}/rest/api/3/issue/${issueKey}?notifyUsers=false`;
  const response = await fetch(url, {
    method: "PUT",
    headers: getJiraHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira updateIssueFields failed: ${response.status} — ${body}`);
  }
}

/**
 * Extract Salesforce client IDs from customfield_10737.
 * These match the externalId field in Vitally.
 */
export function extractClientIds(issue: JiraIssue): string[] {
  const clientField = (issue.fields as Record<string, unknown>)["customfield_10737"];
  if (!clientField) return [];

  if (Array.isArray(clientField)) {
    return clientField.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const id = obj["value"] ?? obj["id"];
        return id ? [String(id)] : [];
      }
      return [];
    });
  }

  if (typeof clientField === "string") {
    return clientField.includes(",")
      ? clientField.split(",").map((s) => s.trim())
      : [clientField];
  }

  if (typeof clientField === "object" && clientField !== null) {
    const obj = clientField as Record<string, unknown>;
    const id = obj["value"] ?? obj["id"];
    return id ? [String(id)] : [];
  }

  return [];
}

/**
 * Fetch all Epics from PROJ that have the Acquired Company field populated
 * and were created on or after 2024-01-01. Used by the weekly Jira sync.
 */
export async function getAcquisitionEpics(): Promise<JiraIssue[]> {
  const jql = [
    `project = ${projectKey()}`,
    `issuetype = Epic`,
    `"Acquired Company" is not EMPTY`,
    `created >= "2024-01-01"`,
    `ORDER BY created DESC`,
  ].join(" AND ");

  const fields = [
    "summary",
    "status",
    "customfield_10571", // Acquired Company (multi-select)
  ].join(",");

  const url = `${baseUrl()}/rest/api/3/search/jql`;
  const headers = getJiraHeaders();
  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      jql,
      maxResults: "100",
      fields,
      ...(nextPageToken ? { nextPageToken } : {}),
    });

    const response = await fetch(`${url}?${params}`, { headers });
    if (!response.ok) {
      throw new Error(
        `Jira getAcquisitionEpics failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const issues: JiraIssue[] = data.issues ?? [];
    allIssues.push(...issues);

    const isLast: boolean = data.isLast ?? false;
    nextPageToken = data.nextPageToken;
    if (issues.length === 0 || isLast || !nextPageToken) break;
  }

  return allIssues;
}

/**
 * Extract the list of Acquired Company names from customfield_10571.
 * Returns an array of display strings (e.g. ["Cereproc", "Lumenvox"]).
 */
export function extractAcquiredCompanies(issue: JiraIssue): string[] {
  const field = (issue.fields as Record<string, unknown>)["customfield_10571"];
  if (!Array.isArray(field)) return [];
  return field.flatMap((item) => {
    if (typeof item === "object" && item !== null) {
      const val = (item as Record<string, unknown>)["value"];
      return val ? [String(val)] : [];
    }
    return [];
  });
}

/** Custom field IDs for the PRP project */
export const JIRA_FIELDS = {
  clientIds: "customfield_10737",
  csPriority: "customfield_10523",
  priorityScore: "customfield_11596",
  clientCount: "customfield_11563",
  product: "customfield_10805",
} as const;
