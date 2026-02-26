import { NextRequest, NextResponse } from "next/server";

function getHeaders(): HeadersInit {
  const email = process.env.JIRA_EMAIL!;
  const token = process.env.JIRA_API_TOKEN!;
  const base64 = Buffer.from(`${email}:${token}`, "ascii").toString("base64");
  return {
    Authorization: `Basic ${base64}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * GET /api/jira/discover-fields?projectKey=PROJ
 *
 * Returns:
 *  - allCustomFields: every custom field defined in Jira
 *  - sampleIssue: the most recently created issue from the project (shows which fields are populated)
 *  - populatedFields: only the custom fields that have non-null values in the sample issue
 *
 * Use this to document custom fields for a new project in the jira-vitally-api SKILL.md.
 */
export async function GET(req: NextRequest) {
  if (!process.env.JIRA_API_TOKEN) {
    return NextResponse.json(
      { error: "JIRA_API_TOKEN is not set in .env" },
      { status: 500 }
    );
  }

  const projectKey =
    req.nextUrl.searchParams.get("projectKey") ?? process.env.JIRA_PROJECT_KEY ?? "PROJ";

  try {
    const headers = getHeaders();

    const jiraBase = process.env.JIRA_BASE_URL!;

    // 1. Fetch all fields defined in Jira
    const fieldsRes = await fetch(`${jiraBase}/rest/api/3/field`, { headers });
    if (!fieldsRes.ok) {
      const body = await fieldsRes.text();
      return NextResponse.json(
        { error: `Failed to fetch fields: ${fieldsRes.status} ${fieldsRes.statusText}`, detail: body },
        { status: fieldsRes.status }
      );
    }
    const allFields: Array<{ id: string; name: string; custom: boolean; schema?: unknown }> =
      await fieldsRes.json();

    const allCustomFields = allFields
      .filter((f) => f.custom)
      .map((f) => ({ id: f.id, name: f.name, schema: f.schema }))
      .sort((a, b) => a.id.localeCompare(b.id));

    // 2. Fetch one sample issue from the project (most recently created)
    const jql = `project = ${projectKey} ORDER BY created DESC`;
    const sampleParams = new URLSearchParams({ jql, maxResults: "1", fields: "*all" });
    const sampleRes = await fetch(
      `${jiraBase}/rest/api/3/search/jql?${sampleParams}`,
      { headers }
    );

    if (!sampleRes.ok) {
      const body = await sampleRes.text();
      return NextResponse.json(
        {
          error: `Failed to fetch sample issue for project ${projectKey}: ${sampleRes.status} ${sampleRes.statusText}`,
          detail: body,
          allCustomFields,
        },
        { status: sampleRes.status }
      );
    }

    const sampleData = await sampleRes.json();
    const sampleIssue = sampleData.issues?.[0] ?? null;

    // 3. Cross-reference: which custom fields are actually populated in the sample issue?
    const populatedFields: Array<{ id: string; name: string; value: unknown }> = [];

    if (sampleIssue?.fields) {
      const fieldMap = Object.fromEntries(allFields.map((f) => [f.id, f.name]));
      for (const [fieldId, value] of Object.entries(sampleIssue.fields)) {
        if (!fieldId.startsWith("customfield_")) continue;
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        populatedFields.push({
          id: fieldId,
          name: fieldMap[fieldId] ?? fieldId,
          value,
        });
      }
      populatedFields.sort((a, b) => a.id.localeCompare(b.id));
    }

    return NextResponse.json({
      projectKey,
      instructions:
        "Copy 'populatedFields' into the SKILL.md under the matching project section. Add each field's name, id, and what it represents.",
      populatedFields,
      sampleIssueKey: sampleIssue?.key ?? null,
      allCustomFields,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Unexpected error", detail: message }, { status: 500 });
  }
}
