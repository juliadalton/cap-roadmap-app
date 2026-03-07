import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pptxgenjs from "pptxgenjs";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 120;

// ── Types ──────────────────────────────────────────────────────────────────────

interface SlideData {
  sectionId: string;
  sectionName: string;
  pageName: string;
  imageData: string;
  data?: unknown;
}

interface ExportRequest {
  title: string;
  slides: SlideData[];
}

// Mirrors the app's AcquisitionProgress shape
interface AcquisitionProgress {
  disposition?: string | null;
  devPlatform?: boolean;
  functionalityEpicsToDo?: number;
  functionalityEpicsInProgress?: number;
  functionalityEpicsComplete?: number;
  clientCountTotal?: number;
  clientAccessCount?: number;
  clientActiveCount?: number;
  clientMetricsApplicable?: boolean;
}

interface AcquisitionData {
  name?: string;
  description?: string;
  integrationOverview?: string;
  color?: string;
  progress?: AcquisitionProgress;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const HEADER_H = 0.6;
const PAD = 0.3;
const NAVY      = "02214D";
const GREEN     = "10B981";
const GREY_TRACK= "E5E7EB";
const GREY_MUTED= "6B7280";
const GREY_PANEL= "F3F4F6";
const GREY_CARD = "FFFFFF";
const BORDER    = "E5E7EB";

const DISPOSITION_COLORS: Record<string, string> = {
  Affiliated: "3B82F6",
  Connected:  "10B981",
  Wrapped:    "8B5CF6",
  Migrated:   "F59E0B",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(num: number, denom: number): number {
  return denom > 0 ? Math.round((num / denom) * 100) : 0;
}

/** Draw a labelled progress bar row inside a step card. */
function addProgressBar(
  slide: ReturnType<InstanceType<typeof pptxgenjs>["addSlide"]>,
  x: number, y: number, w: number,
  fillPct: number,      // 0–100, primary colour segment
  fill2Pct: number,     // 0–100, secondary colour segment (multi-segment)
  primaryColor: string,
  secondaryColor: string,
  percentLabel: string,
) {
  const BAR_H = 0.12;
  const LABEL_W = 0.65;
  const barW = w - LABEL_W;

  // Track
  slide.addShape((pptxgenjs as any).ShapeType?.roundRect ?? "roundRect", {
    x, y, w: barW, h: BAR_H,
    fill: { color: GREY_TRACK },
    line: { color: GREY_TRACK },
    rectRadius: 0.06,
  });

  // Primary fill
  if (fillPct > 0) {
    slide.addShape((pptxgenjs as any).ShapeType?.roundRect ?? "roundRect", {
      x, y,
      w: barW * (fillPct / 100),
      h: BAR_H,
      fill: { color: primaryColor },
      line: { color: primaryColor },
      rectRadius: 0.06,
    });
  }

  // Secondary fill (starts after primary)
  if (fill2Pct > 0) {
    const offset = barW * (fillPct / 100);
    slide.addShape((pptxgenjs as any).ShapeType?.roundRect ?? "roundRect", {
      x: x + offset, y,
      w: barW * (fill2Pct / 100),
      h: BAR_H,
      fill: { color: secondaryColor },
      line: { color: secondaryColor },
      rectRadius: 0.06,
    });
  }

  // Percentage label
  slide.addText(percentLabel, {
    x: x + barW + 0.05, y: y - 0.03,
    w: LABEL_W - 0.05, h: BAR_H + 0.06,
    fontSize: 12, bold: true,
    color: GREY_MUTED, align: "right", valign: "middle",
  });
}

/** Draw a rounded-rectangle badge with text. */
function addBadge(
  slide: ReturnType<InstanceType<typeof pptxgenjs>["addSlide"]>,
  x: number, y: number, w: number, h: number,
  text: string,
  bgColor: string,
  textColor: string,
  borderColor?: string,
) {
  slide.addShape((pptxgenjs as any).ShapeType?.roundRect ?? "roundRect", {
    x, y, w, h,
    fill: { color: bgColor },
    line: { color: borderColor ?? bgColor },
    rectRadius: h / 2,
  });
  slide.addText(text, {
    x, y, w, h,
    fontSize: 10, bold: true,
    color: textColor, align: "center", valign: "middle",
  });
}

/** Draw a step card (white rounded rect with border). */
function addStepCard(
  slide: ReturnType<InstanceType<typeof pptxgenjs>["addSlide"]>,
  x: number, y: number, w: number, h: number,
  isActive: boolean,
) {
  slide.addShape((pptxgenjs as any).ShapeType?.roundRect ?? "roundRect", {
    x, y, w, h,
    fill: { color: GREY_CARD },
    line: { color: isActive ? NAVY : BORDER },
    rectRadius: 0.1,
  });
}

// ── Main builder ───────────────────────────────────────────────────────────────

function buildTrackerSlide(
  pptx: InstanceType<typeof pptxgenjs>,
  slide: ReturnType<InstanceType<typeof pptxgenjs>["addSlide"]>,
  acquisition: AcquisitionData,
) {
  const p = acquisition.progress ?? {};
  const clientApplicable = p.clientMetricsApplicable !== false;

  // ── Computed values ─────────────────────────────────────────────────────────
  const totalEpics     = (p.functionalityEpicsToDo ?? 0) + (p.functionalityEpicsInProgress ?? 0) + (p.functionalityEpicsComplete ?? 0);
  const epicCompletePct   = pct(p.functionalityEpicsComplete ?? 0, totalEpics);
  const epicInProgPct     = pct(p.functionalityEpicsInProgress ?? 0, totalEpics);
  const clientAccessPct   = pct(p.clientAccessCount ?? 0, p.clientCountTotal ?? 0);
  const clientActivePct   = pct(p.clientActiveCount ?? 0, p.clientCountTotal ?? 0);
  const devPlatformDone   = p.devPlatform === true;

  const functionalityStatus = epicCompletePct === 100 ? "complete"
    : (epicCompletePct > 0 || epicInProgPct > 0) ? "in-progress"
    : "not-started";
  const accessStatus  = !clientApplicable ? "na"
    : clientAccessPct === 100 ? "complete"
    : clientAccessPct > 0 ? "in-progress" : "not-started";
  const activeStatus  = !clientApplicable ? "na"
    : clientActivePct === 100 ? "complete"
    : clientActivePct > 0 ? "in-progress" : "not-started";

  const devProgress         = devPlatformDone ? 100 : 0;
  const technicalProgress   = (devProgress + epicCompletePct) / 2;
  const clientProgress      = clientApplicable
    ? (clientAccessPct + clientActivePct) / 2 : null;
  const overallProgress = clientProgress !== null
    ? Math.round((technicalProgress + clientProgress) / 2)
    : Math.round(technicalProgress);

  const acqColor = (acquisition.color ?? "#02214D")
    .replace(/^#/, "")
    .replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/, (_, r, g, b) =>
      [r, g, b].map((n: string) => parseInt(n).toString(16).padStart(2, "0")).join("")
    );

  // ── Layout constants ────────────────────────────────────────────────────────
  const CONTENT_TOP   = HEADER_H + 0.2;
  const NAME_H        = 0.44;
  // Description wraps — allow up to 2 lines worth of height
  const DESC_H        = acquisition.description ? 0.36 : 0;
  const OVERALL_TOP   = CONTENT_TOP + NAME_H + DESC_H + 0.1;
  const OVERALL_BAR_H = 0.16;
  const PANELS_TOP    = OVERALL_TOP + OVERALL_BAR_H + 0.42;
  const PANEL_W       = (SLIDE_W - PAD * 3) / 2;

  const TECH_X = PAD;
  const CLIE_X = PAD * 2 + PANEL_W;

  const STEP_W    = PANEL_W - PAD * 2;
  const CARD_PAD  = 0.14;
  const BADGE_W   = 1.05;
  const BADGE_H   = 0.26;

  // Row heights within each step card
  const ROW_TITLE = 0.26;   // step title text
  const ROW_BAR   = 0.22;   // progress bar + label
  const ROW_LEGEND= 0.22;   // legend dots (func only)
  const ROW_COUNTS= 0.2;    // detail count text
  const ROW_GAP   = 0.08;   // gap between title and bar

  // Dev Platform card: title + badge only (no bar)
  const DEV_CARD_H   = CARD_PAD * 2 + ROW_TITLE;
  // Func card: title + bar + legend + counts
  const FUNC_CARD_H  = CARD_PAD * 2 + ROW_TITLE + ROW_GAP + ROW_BAR + ROW_LEGEND + (totalEpics > 0 ? ROW_COUNTS : 0);
  // Access card: title + bar + counts (if applicable)
  const ACCESS_CARD_H = clientApplicable
    ? CARD_PAD * 2 + ROW_TITLE + ROW_GAP + ROW_BAR + ROW_COUNTS
    : CARD_PAD * 2 + ROW_TITLE;
  // Active card: same as access
  const ACTIVE_CARD_H = ACCESS_CARD_H;

  const STEP_GAP  = 0.14;
  const PANEL_TITLE_H = 0.32;

  // Both panels' step 2 cards are vertically aligned, so both use the taller of the two step-1 cards
  const STEP1_CARD_H  = Math.max(DEV_CARD_H, ACCESS_CARD_H);
  const STEP1_Y   = PANELS_TOP + PANEL_TITLE_H;
  const STEP2_Y   = STEP1_Y + STEP1_CARD_H + STEP_GAP;

  // Panel heights are based on what actually renders inside each panel
  const TECH_PANELS_H = PANEL_TITLE_H + STEP1_CARD_H + STEP_GAP + FUNC_CARD_H + PAD * 0.5;
  const CLIE_PANELS_H = PANEL_TITLE_H + STEP1_CARD_H + STEP_GAP + ACTIVE_CARD_H + PAD * 0.5;
  const PANELS_H  = Math.max(TECH_PANELS_H, CLIE_PANELS_H);

  // Integration Overview section (below panels, if present)
  const OVERVIEW_GAP     = 0.16;
  const OVERVIEW_PAD     = 0.16;
  const OVERVIEW_LABEL_H = 0.28;
  const OVERVIEW_TEXT_H  = 0.3;   // single-line; expands naturally in PPTX
  const OVERVIEW_H       = acquisition.integrationOverview
    ? OVERVIEW_PAD * 2 + OVERVIEW_LABEL_H + OVERVIEW_TEXT_H
    : 0;

  // ── Header bar ──────────────────────────────────────────────────────────────
  slide.addShape((pptx as any).ShapeType?.rect ?? "rect", {
    x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
    fill: { color: NAVY }, line: { color: NAVY },
    rectRadius: 0,
  });

  slide.addText("Acquisition Tracker", {
    x: PAD, y: 0, w: SLIDE_W - PAD * 2, h: HEADER_H,
    fontSize: 16, color: "CCCCCC", valign: "middle", align: "right",
  });

  // ── Acquisition name + color dot ─────────────────────────────────────────
  // Color accent dot
  slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
    x: PAD, y: CONTENT_TOP + 0.1,
    w: 0.2, h: 0.2,
    fill: { color: acqColor }, line: { color: acqColor },
    rectRadius: 0.1,
  });

  slide.addText((acquisition.name ?? "").toUpperCase(), {
    x: PAD + 0.3, y: CONTENT_TOP,
    w: SLIDE_W - PAD * 2 - 0.3 - 1.3, h: NAME_H,
    fontSize: 20, bold: true, color: "1F2937", valign: "middle",
  });

  // Disposition badge (top-right of name row)
  if (p.disposition) {
    const dispColor = DISPOSITION_COLORS[p.disposition] ?? GREY_MUTED;
    slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
      x: SLIDE_W - PAD - 1.15, y: CONTENT_TOP + 0.08,
      w: 1.15, h: 0.3,
      fill: { color: "FFFFFF" }, line: { color: dispColor },
      rectRadius: 0.15,
    });
    slide.addText(p.disposition, {
      x: SLIDE_W - PAD - 1.15, y: CONTENT_TOP + 0.08,
      w: 1.15, h: 0.3,
      fontSize: 11, bold: true, color: dispColor,
      align: "center", valign: "middle",
    });
  }

  // Description
  if (acquisition.description) {
    slide.addText(acquisition.description, {
      x: PAD + 0.3, y: CONTENT_TOP + NAME_H,
      w: SLIDE_W - PAD * 2 - 0.3, h: DESC_H,
      fontSize: 12, color: GREY_MUTED, valign: "top",
    });
  }

  // ── Overall progress bar ─────────────────────────────────────────────────
  // Right column: 1.8" wide — enough to stack the % number and "Combined Status" without overlap
  const OVERALL_RIGHT_W = 1.8;
  const OVERALL_BAR_Y   = OVERALL_TOP + 0.3;
  const OVERALL_BAR_W   = SLIDE_W - PAD * 2 - OVERALL_RIGHT_W;
  const OVERALL_RIGHT_X = PAD + OVERALL_BAR_W + 0.1;

  slide.addText("Overall Integration Progress", {
    x: PAD, y: OVERALL_TOP,
    w: OVERALL_BAR_W, h: 0.28,
    fontSize: 16, bold: true, color: "1F2937",
  });
  // % number — top of the right column
  slide.addText(`${overallProgress}%`, {
    x: OVERALL_RIGHT_X, y: OVERALL_TOP,
    w: OVERALL_RIGHT_W - 0.1, h: 0.3,
    fontSize: 24, bold: true, color: NAVY, align: "right", valign: "top",
  });
  // "Combined Status" label — sits directly below the % number
  slide.addText("Combined Status", {
    x: OVERALL_RIGHT_X, y: OVERALL_TOP + 0.36,
    w: OVERALL_RIGHT_W - 0.1, h: 0.18,
    fontSize: 10, color: GREY_MUTED, align: "right",
  });

  // Track
  slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
    x: PAD, y: OVERALL_BAR_Y,
    w: OVERALL_BAR_W, h: OVERALL_BAR_H,
    fill: { color: GREY_TRACK }, line: { color: GREY_TRACK }, rectRadius: 0.08,
  });
  if (overallProgress > 0) {
    slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
      x: PAD, y: OVERALL_BAR_Y,
      w: OVERALL_BAR_W * (overallProgress / 100), h: OVERALL_BAR_H,
      fill: { color: GREEN }, line: { color: GREEN }, rectRadius: 0.08,
    });
  }

  // ── Panel backgrounds ────────────────────────────────────────────────────
  // Technical Integration panel
  slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
    x: TECH_X, y: PANELS_TOP, w: PANEL_W, h: PANELS_H,
    fill: { color: GREY_PANEL }, line: { color: GREY_PANEL }, rectRadius: 0.12,
  });
  // Client Migrations panel
  slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
    x: CLIE_X, y: PANELS_TOP, w: PANEL_W, h: PANELS_H,
    fill: { color: GREY_PANEL }, line: { color: GREY_PANEL }, rectRadius: 0.12,
  });

  // Panel titles
  slide.addText("TECHNICAL INTEGRATION", {
    x: TECH_X + PAD, y: PANELS_TOP + 0.08,
    w: PANEL_W - PAD * 2, h: PANEL_TITLE_H - 0.08,
    fontSize: 12, bold: true, color: NAVY,
  });
  slide.addText("CLIENT MIGRATIONS", {
    x: CLIE_X + PAD, y: PANELS_TOP + 0.08,
    w: PANEL_W - PAD * 2, h: PANEL_TITLE_H - 0.08,
    fontSize: 12, bold: true, color: NAVY,
  });

  // ── Status badge helper ───────────────────────────────────────────────────
  function statusBadgeFor(status: string, label?: string) {
    if (status === "complete")    return { bg: GREEN,  text: "FFFFFF", label: label ?? "Complete" };
    if (status === "in-progress") return { bg: NAVY,   text: "FFFFFF", label: label ?? "In Progress" };
    if (status === "na")          return { bg: GREY_TRACK, text: GREY_MUTED, label: label ?? "Not Applicable" };
    return { bg: "F3F4F6", text: GREY_MUTED, label: label ?? "Not Started" };
  }

  const STEP_CONTENT_X = (panelX: number) => panelX + PAD + CARD_PAD;
  const STEP_CONTENT_W = STEP_W - CARD_PAD * 2;

  // ── STEP 1 — Dev Platform ───────────────────────────────────────────────
  const devStatus = devPlatformDone ? "complete" : "not-started";
  const devBadge  = statusBadgeFor(devStatus, devPlatformDone ? "Connected" : "Not Connected");
  addStepCard(slide, TECH_X + PAD, STEP1_Y, STEP_W, DEV_CARD_H, false);

  slide.addText("1. Dev Platform", {
    x: STEP_CONTENT_X(TECH_X), y: STEP1_Y + CARD_PAD,
    w: STEP_CONTENT_W - BADGE_W - 0.1, h: ROW_TITLE,
    fontSize: 13, bold: true, color: "1F2937",
  });
  addBadge(slide,
    TECH_X + PAD + STEP_W - CARD_PAD - BADGE_W,
    STEP1_Y + CARD_PAD,
    BADGE_W, BADGE_H,
    devBadge.label, devBadge.bg, devBadge.text,
  );

  // ── STEP 2 — Functionality in Console ──────────────────────────────────
  const funcBadge = statusBadgeFor(functionalityStatus);
  addStepCard(slide, TECH_X + PAD, STEP2_Y, STEP_W, FUNC_CARD_H, functionalityStatus === "in-progress");

  slide.addText("2. Functionality in Console", {
    x: STEP_CONTENT_X(TECH_X), y: STEP2_Y + CARD_PAD,
    w: STEP_CONTENT_W - BADGE_W - 0.1, h: ROW_TITLE,
    fontSize: 13, bold: true, color: "1F2937",
  });
  addBadge(slide,
    TECH_X + PAD + STEP_W - CARD_PAD - BADGE_W,
    STEP2_Y + CARD_PAD,
    BADGE_W, BADGE_H,
    funcBadge.label, funcBadge.bg, funcBadge.text,
  );

  // Functionality progress bar
  const funcBarY = STEP2_Y + CARD_PAD + ROW_TITLE + ROW_GAP;
  addProgressBar(
    slide,
    STEP_CONTENT_X(TECH_X),
    funcBarY,
    STEP_CONTENT_W,
    epicCompletePct, epicInProgPct,
    GREEN, NAVY,
    `${epicCompletePct}%`,
  );

  // Epic counts legend
  const legendY = funcBarY + ROW_BAR - 0.06;
  const dots: Array<{ color: string; label: string }> = [
    { color: GREEN, label: "Complete" },
    { color: NAVY,  label: "In Progress" },
    { color: GREY_TRACK, label: "To Do" },
  ];
  dots.forEach(({ color, label }, i) => {
    const lx = STEP_CONTENT_X(TECH_X) + i * 1.3;
    slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
      x: lx, y: legendY + 0.04,
      w: 0.1, h: 0.1,
      fill: { color }, line: { color }, rectRadius: 0.05,
    });
    slide.addText(label, {
      x: lx + 0.15, y: legendY,
      w: 1.1, h: 0.2,
      fontSize: 10, color: GREY_MUTED,
    });
  });

  // Epic detail counts
  if (totalEpics > 0) {
    slide.addText(
      `${p.functionalityEpicsComplete ?? 0} complete · ${p.functionalityEpicsInProgress ?? 0} in progress · ${p.functionalityEpicsToDo ?? 0} to do`,
      {
        x: STEP_CONTENT_X(TECH_X), y: legendY + ROW_LEGEND,
        w: STEP_CONTENT_W, h: ROW_COUNTS,
        fontSize: 11, color: GREY_MUTED,
      }
    );
  }

  // ── STEP 3 — Clients With Access ────────────────────────────────────────
  const accessBadge = statusBadgeFor(accessStatus);
  addStepCard(slide, CLIE_X + PAD, STEP1_Y, STEP_W, ACCESS_CARD_H, accessStatus === "in-progress");

  slide.addText("1. Clients With Access to Console", {
    x: STEP_CONTENT_X(CLIE_X), y: STEP1_Y + CARD_PAD,
    w: STEP_CONTENT_W - BADGE_W - 0.1, h: ROW_TITLE,
    fontSize: 13, bold: true, color: "1F2937",
  });
  addBadge(slide,
    CLIE_X + PAD + STEP_W - CARD_PAD - BADGE_W,
    STEP1_Y + CARD_PAD,
    BADGE_W, BADGE_H,
    accessBadge.label, accessBadge.bg, accessBadge.text,
  );

  if (clientApplicable) {
    const accessBarY = STEP1_Y + CARD_PAD + ROW_TITLE + ROW_GAP;
    addProgressBar(
      slide,
      STEP_CONTENT_X(CLIE_X),
      accessBarY,
      STEP_CONTENT_W,
      clientAccessPct, 0,
      clientAccessPct === 100 ? GREEN : NAVY, NAVY,
      `${clientAccessPct}%`,
    );
    slide.addText(
      `${p.clientAccessCount ?? 0} with access · ${(p.clientCountTotal ?? 0) - (p.clientAccessCount ?? 0)} without · ${p.clientCountTotal ?? 0} total`,
      {
        x: STEP_CONTENT_X(CLIE_X), y: accessBarY + ROW_BAR - 0.04,
        w: STEP_CONTENT_W, h: ROW_COUNTS,
        fontSize: 11, color: GREY_MUTED,
      }
    );
  }

  // ── STEP 4 — Clients Active ──────────────────────────────────────────────
  const activeBadge = statusBadgeFor(activeStatus);
  addStepCard(slide, CLIE_X + PAD, STEP2_Y, STEP_W, ACTIVE_CARD_H, activeStatus === "in-progress");

  slide.addText("2. Clients Active in the Console", {
    x: STEP_CONTENT_X(CLIE_X), y: STEP2_Y + CARD_PAD,
    w: STEP_CONTENT_W - BADGE_W - 0.1, h: ROW_TITLE,
    fontSize: 13, bold: true, color: "1F2937",
  });
  addBadge(slide,
    CLIE_X + PAD + STEP_W - CARD_PAD - BADGE_W,
    STEP2_Y + CARD_PAD,
    BADGE_W, BADGE_H,
    activeBadge.label, activeBadge.bg, activeBadge.text,
  );

  if (clientApplicable) {
    const activeBarY = STEP2_Y + CARD_PAD + ROW_TITLE + ROW_GAP;
    addProgressBar(
      slide,
      STEP_CONTENT_X(CLIE_X),
      activeBarY,
      STEP_CONTENT_W,
      clientActivePct, 0,
      clientActivePct === 100 ? GREEN : NAVY, NAVY,
      `${clientActivePct}%`,
    );
    slide.addText(
      `${p.clientActiveCount ?? 0} active · ${(p.clientCountTotal ?? 0) - (p.clientActiveCount ?? 0)} not yet active · ${p.clientCountTotal ?? 0} total`,
      {
        x: STEP_CONTENT_X(CLIE_X), y: activeBarY + ROW_BAR - 0.04,
        w: STEP_CONTENT_W, h: ROW_COUNTS,
        fontSize: 11, color: GREY_MUTED,
      }
    );
  }

  // ── Integration Overview ─────────────────────────────────────────────────
  if (acquisition.integrationOverview) {
    const overviewY = PANELS_TOP + PANELS_H + OVERVIEW_GAP;
    slide.addShape((pptx as any).ShapeType?.roundRect ?? "roundRect", {
      x: PAD, y: overviewY,
      w: SLIDE_W - PAD * 2, h: OVERVIEW_H,
      fill: { color: GREY_PANEL }, line: { color: GREY_PANEL }, rectRadius: 0.1,
    });
    slide.addText("Integration Overview", {
      x: PAD + OVERVIEW_PAD, y: overviewY + OVERVIEW_PAD,
      w: SLIDE_W - PAD * 2 - OVERVIEW_PAD * 2, h: OVERVIEW_LABEL_H,
      fontSize: 16, bold: true, color: "1F2937",
    });
    slide.addText(acquisition.integrationOverview, {
      x: PAD + OVERVIEW_PAD, y: overviewY + OVERVIEW_PAD + OVERVIEW_LABEL_H,
      w: SLIDE_W - PAD * 2 - OVERVIEW_PAD * 2, h: OVERVIEW_TEXT_H,
      fontSize: 12, color: GREY_MUTED, wrap: true,
    });
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ExportRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, slides } = body;
  if (!title || !Array.isArray(slides)) {
    return NextResponse.json({ error: "title and slides are required" }, { status: 400 });
  }

  const pptx = new pptxgenjs();
  pptx.layout = "LAYOUT_WIDE";

  // ── Load Capacity wordmark logo (SVG → base64 data URL) ───────────────────
  let logoPngData: string | null = null;
  try {
    const svgPath = join(process.cwd(), "public", "Capacity-Wordmark-white.svg");
    const svgBuffer = readFileSync(svgPath);
    logoPngData = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;
  } catch {
    // Logo unavailable — continue without it
  }

  // ── Cover slide ───────────────────────────────────────────────────────────
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: NAVY };

  if (logoPngData) {
    coverSlide.addImage({ data: logoPngData, x: 0.45, y: 0.45, w: 2.1, h: 0.42 });
  }

  coverSlide.addText(title, {
    x: 0, y: SLIDE_H / 2 - 0.5, w: SLIDE_W, h: 1,
    align: "center", fontSize: 40, bold: true, color: "FFFFFF",
  });

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  coverSlide.addText(dateStr, {
    x: 0, y: SLIDE_H / 2 + 0.6, w: SLIDE_W, h: 0.5,
    align: "center", fontSize: 18, color: "CCCCCC",
  });

  // ── Content slides ────────────────────────────────────────────────────────
  for (const slide of slides) {
    const s = pptx.addSlide();

    if (slide.sectionId?.startsWith("tracker-") && slide.data) {
      // Native PPTX elements for acquisition tracker slides
      buildTrackerSlide(pptx, s, slide.data as AcquisitionData);
    } else {
      // Screenshot-based slide for all other sections
      s.addShape((pptx as any).ShapeType?.rect ?? "rect", {
        x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
        fill: { color: NAVY }, line: { color: NAVY },
      });
      s.addText(slide.sectionName, {
        x: PAD, y: 0, w: SLIDE_W * 0.65, h: HEADER_H,
        fontSize: 18, bold: true, color: "FFFFFF", valign: "middle",
      });
      s.addText(slide.pageName, {
        x: SLIDE_W * 0.65, y: 0, w: SLIDE_W * 0.35 - PAD, h: HEADER_H,
        fontSize: 12, color: "CCCCCC", align: "right", valign: "middle",
      });

      if (slide.imageData) {
        const contentW = SLIDE_W - PAD * 2;
        const contentH = SLIDE_H - HEADER_H - PAD * 2;
        s.addImage({
          data: slide.imageData,
          x: PAD, y: HEADER_H + PAD, w: contentW, h: contentH,
          sizing: { type: "contain", w: contentW, h: contentH },
        });
      } else {
        s.addText("Content could not be captured", {
          x: 0, y: HEADER_H, w: SLIDE_W, h: SLIDE_H - HEADER_H,
          align: "center", valign: "middle", fontSize: 18, color: "999999",
        });
      }
    }
  }

  // ── Write and return ──────────────────────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const safeName = title.replace(/[^a-z0-9_\-\s]/gi, "").replace(/\s+/g, "_");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeName}.pptx"`,
    },
  });
}
