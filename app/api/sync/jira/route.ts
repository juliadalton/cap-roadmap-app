import { NextRequest, NextResponse } from "next/server";
import { runJiraSync } from "@/lib/services/jira-sync";
import { requireEditorSession } from "@/lib/auth";

export const maxDuration = 300;

/**
 * GET /api/sync/jira
 * Called by Vercel Cron every Friday at 11:30pm CT (05:30 UTC Saturday).
 * Protected by CRON_SECRET Bearer token.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runJiraSync();
    return NextResponse.json({ ok: true, durationMs: Date.now() - started, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - started },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/jira
 * Editor-triggered manual sync. Authenticated via session.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireEditorSession();
  if (error) return error;

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  const started = Date.now();
  try {
    const result = await runJiraSync(dryRun);
    return NextResponse.json({ ok: true, durationMs: Date.now() - started, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - started },
      { status: 500 }
    );
  }
}
