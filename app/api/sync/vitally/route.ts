import { NextRequest, NextResponse } from "next/server";
import { runVitallySync } from "@/lib/services/vitally-sync";
import { requireEditorSession } from "@/lib/auth";

// Allow up to 5 minutes — sync touches every Vitally account and every acquisition
export const maxDuration = 300;

/**
 * GET /api/sync/vitally
 *
 * Called nightly by Vercel Cron. Protected by a shared secret so it cannot
 * be triggered by arbitrary external requests.
 *
 * Vercel automatically sets:
 *   Authorization: Bearer {CRON_SECRET}
 *
 * You can also trigger it manually by passing the same header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on this server" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  try {
    const result = await runVitallySync();

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - started },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/vitally
 *
 * Editor-triggered manual sync. Uses session auth so the CRON_SECRET
 * never needs to reach the browser.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireEditorSession();
  if (error) return error;

  const started = Date.now();

  try {
    const result = await runVitallySync();

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - started },
      { status: 500 }
    );
  }
}
