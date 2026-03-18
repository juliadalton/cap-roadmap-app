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
  imageWidth?: number;
  imageHeight?: number;
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

// ── Methodology slide helpers ───────────────────────────────────────────────────

function addMethodologyHeader(pptx: pptxgenjs, s: pptxgenjs.Slide, title: string) {
  s.addShape("rect" as any, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText(title, { x: PAD, y: 0, w: SLIDE_W * 0.72, h: HEADER_H, fontSize: 18, bold: true, color: "FFFFFF", valign: "middle" });
  s.addText("Integration Methodology", { x: SLIDE_W * 0.72, y: 0, w: SLIDE_W * 0.28 - PAD, h: HEADER_H, fontSize: 11, color: "CCCCCC", align: "right", valign: "middle" });
}

function buildMethodologyEndStates(pptx: pptxgenjs, s: pptxgenjs.Slide) {
  addMethodologyHeader(pptx, s, "Acquisition End States");
  const ct = HEADER_H + PAD;
  const cw = SLIDE_W - PAD * 2;
  s.addText("Every acquisition is assigned an end state — a disposition describing the intended level of technical integration between the acquired platform and Capacity. These four states represent a spectrum from loosely affiliated to fully migrated.", {
    x: PAD, y: ct, w: cw, h: 0.45, fontSize: 14, color: GREY_MUTED, wrap: true,
  });

  const ARROW_W = 0.35;
  const cardW = (cw - ARROW_W * 3) / 4;
  const cardY = ct + 0.5;
  // Fixed height: label badge + padding + 3 lines of 13pt body + bottom padding
  const LABEL_H = 0.42;   // 18pt badge
  const BODY_H  = 1.5;    // enough for ~3-4 lines at 13pt
  const cardH   = 0.2 + LABEL_H + 0.2 + BODY_H + 0.2;  // top pad + badge + gap + body + bottom pad

  const dispositions = [
    { label: "Affiliated", description: "Not connected except the same ownership group. Independent operations with minimal technical overlap.", bg: "EFF6FF", border: "BFDBFE", labelBg: "DBEAFE", labelColor: "1D4ED8" },
    { label: "Connected",  description: "API connections established through our developer platform or other methods. Data exchange enabled between systems.", bg: "ECFDF5", border: "A7F3D0", labelBg: "D1FAE5", labelColor: "047857" },
    { label: "Wrapped",    description: "Keep and use the acquired backend technology but consolidate/wrap the front end into the Capacity console.", bg: "F5F3FF", border: "DDD6FE", labelBg: "EDE9FE", labelColor: "6D28D9" },
    { label: "Migrated",   description: "Migrate desired functionality into Capacity. Deprecate or put legacy platform into maintenance mode.", bg: "FFFBEB", border: "FDE68A", labelBg: "FEF3C7", labelColor: "B45309" },
  ];

  dispositions.forEach((d, i) => {
    const cardX = PAD + i * (cardW + ARROW_W);
    s.addShape("roundRect" as any, { x: cardX, y: cardY, w: cardW - 0.04, h: cardH, fill: { color: d.bg }, line: { color: d.border, pt: 1 }, rectRadius: 0.08 });
    // Label badge
    s.addShape("roundRect" as any, { x: cardX + 0.15, y: cardY + 0.2, w: cardW - 0.34, h: LABEL_H, fill: { color: d.labelBg }, line: { color: d.border, pt: 1 }, rectRadius: 0.06 });
    s.addText(d.label, { x: cardX + 0.15, y: cardY + 0.2, w: cardW - 0.34, h: LABEL_H, fontSize: 18, bold: true, color: d.labelColor, align: "center", valign: "middle" });
    // Body text
    s.addText(d.description, { x: cardX + 0.15, y: cardY + 0.2 + LABEL_H + 0.18, w: cardW - 0.3, h: BODY_H, fontSize: 13, color: "374151", wrap: true, valign: "top" });
    // Arrow
    if (i < 3) s.addText("→", { x: cardX + cardW - 0.04, y: cardY + cardH / 2 - 0.2, w: ARROW_W, h: 0.4, fontSize: 16, color: "9CA3AF", align: "center", valign: "middle" });
  });

  s.addText("↑  Arrow indicates increasing integration depth. Acquisitions are not required to progress sequentially — end state reflects intended destination, not current progress.", {
    x: PAD, y: cardY + cardH + 0.15, w: cw, h: 0.25, fontSize: 8.5, color: GREY_MUTED, italic: true,
  });
}

function buildMethodologyOverallProgress(pptx: pptxgenjs, s: pptxgenjs.Slide) {
  addMethodologyHeader(pptx, s, "Overall Integration Progress");
  const ct = HEADER_H + PAD;
  const cw = SLIDE_W - PAD * 2;

  s.addText("A high-level benchmark calculated by averaging the Technical Integration score and the Client Migration score. When client migration is marked as Not Applicable, the overall score is based entirely on Technical Integration.", {
    x: PAD, y: ct, w: cw, h: 0.45, fontSize: 14, color: GREY_MUTED, wrap: true,
  });

  // Formula row
  const blockW = 3.0; const blockH = 0.95; const opW = 0.55;
  const formulaW = blockW * 3 + opW * 2;
  const fX = PAD + (cw - formulaW) / 2;
  const fY = ct + 0.55;

  const blocks = [
    { label: "Technical Integration", sub: "Dev Platform + % Epics Complete", bg: "EFF6FF", border: "BFDBFE", tc: "1D4ED8" },
    { label: "Client Migration",      sub: "Access + Active (if applicable)",  bg: "ECFDF5", border: "A7F3D0", tc: "047857" },
    { label: "Overall Progress",      sub: "Combined benchmark %",             bg: "F8FAFC", border: "E2E8F0", tc: "475569" },
  ];
  const ops = ["+", "÷ 2  ="];

  blocks.forEach((b, i) => {
    const bx = fX + i * (blockW + opW);
    s.addShape("roundRect" as any, { x: bx, y: fY, w: blockW, h: blockH, fill: { color: b.bg }, line: { color: b.border, pt: 1 }, rectRadius: 0.08 });
    s.addText(b.label, { x: bx + 0.1, y: fY + 0.13, w: blockW - 0.2, h: 0.33, fontSize: 12, bold: true, color: b.tc, align: "center" });
    s.addText(b.sub, { x: bx + 0.1, y: fY + 0.5, w: blockW - 0.2, h: 0.33, fontSize: 9, color: GREY_MUTED, align: "center" });
    if (i < 2) s.addText(ops[i], { x: bx + blockW, y: fY, w: opW, h: blockH, fontSize: 20, color: "9CA3AF", align: "center", valign: "middle" });
  });

  // Progress bars
  const barAreaW = cw * 0.72;
  const bsX = PAD + (cw - barAreaW) / 2;
  const labelW = 2.8;
  const trackW = barAreaW - labelW - 0.55;
  const barsTop = fY + blockH + 0.45;
  const barH = 0.18; const boldBarH = 0.22; const gap = 0.52;

  const bars = [
    { label: "Technical Integration",        pct: 0.5,  color: "3B82F6", pctLabel: "50%", bold: false },
    { label: "Client Migration",             pct: 0.75, color: "10B981", pctLabel: "75%", bold: false },
    { label: "Overall Integration Progress", pct: 0.63, color: NAVY,     pctLabel: "63%", bold: true  },
  ];

  bars.forEach((bar, i) => {
    const bY = barsTop + i * gap;
    const bh = bar.bold ? boldBarH : barH;
    s.addText(bar.label, { x: bsX, y: bY - 0.02, w: labelW, h: 0.24, fontSize: bar.bold ? 11 : 10, bold: bar.bold, color: bar.bold ? "111827" : GREY_MUTED });
    s.addText(bar.pctLabel, { x: bsX + barAreaW - 0.48, y: bY - 0.02, w: 0.48, h: 0.24, fontSize: bar.bold ? 11 : 10, bold: bar.bold, color: bar.bold ? "111827" : GREY_MUTED, align: "right" });
    s.addShape("roundRect" as any, { x: bsX + labelW + 0.1, y: bY, w: trackW, h: bh, fill: { color: "E2E8F0" }, line: { color: "E2E8F0" }, rectRadius: 0.07 });
    s.addShape("roundRect" as any, { x: bsX + labelW + 0.1, y: bY, w: trackW * bar.pct, h: bh, fill: { color: bar.color }, line: { color: bar.color }, rectRadius: 0.07 });
  });

  s.addText("Example: (50% technical + 75% client) ÷ 2 = 63% overall", {
    x: PAD, y: barsTop + bars.length * gap + 0.12, w: cw, h: 0.25, fontSize: 9, color: GREY_MUTED, italic: true, align: "center",
  });
}

function buildMethodologyTechnical(pptx: pptxgenjs, s: pptxgenjs.Slide) {
  addMethodologyHeader(pptx, s, "Technical Integration");
  const ct = HEADER_H + PAD;
  const cw = SLIDE_W - PAD * 2;
  const cs = 0.34; // circle size
  const textX = PAD + cs + 0.18;
  const textW = cw - cs - 0.18;

  s.addText("Evaluated across two steps, each contributing 25% toward the overall integration score (50% combined).", {
    x: PAD, y: ct, w: cw, h: 0.35, fontSize: 14, color: GREY_MUTED,
  });

  // Step 1
  const s1Y = ct + 0.38;
  s.addShape("ellipse" as any, { x: PAD, y: s1Y, w: cs, h: cs, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText("1", { x: PAD, y: s1Y, w: cs, h: cs, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  s.addText("Dev Platform Connected", { x: textX, y: s1Y, w: textW, h: 0.28, fontSize: 13, bold: true, color: "111827" });
  s.addText("The most fundamental measure of technical integration. Set to Connected when a basic API integration and/or concierge chatbot has been established. Until this is true, no meaningful technical integration has occurred.", {
    x: textX, y: s1Y + 0.3, w: textW, h: 0.45, fontSize: 10, color: GREY_MUTED, wrap: true,
  });

  const indY = s1Y + 0.82;
  const indH = 0.32;
  const inds = [
    { label: "Connected", sub: "— contributes 50% of Technical score", bg: "ECFDF5", border: "A7F3D0", tc: "047857" },
    { label: "Not Connected", sub: "— contributes 0%", bg: "F8FAFC", border: "E2E8F0", tc: "6B7280" },
  ];
  inds.forEach((ind, i) => {
    const indX = textX + i * (5.0 + 0.2);
    s.addShape("roundRect" as any, { x: indX, y: indY, w: 5.0, h: indH, fill: { color: ind.bg }, line: { color: ind.border, pt: 1 }, rectRadius: 0.06 });
    s.addText(`${ind.label}  ${ind.sub}`, { x: indX + 0.12, y: indY, w: 4.8, h: indH, fontSize: 10, color: ind.tc, valign: "middle" });
  });

  // Divider
  const divY = indY + indH + 0.18;
  s.addShape("rect" as any, { x: PAD, y: divY, w: cw, h: 0.01, fill: { color: "E2E8F0" }, line: { color: "E2E8F0" } });

  // Step 2
  const s2Y = divY + 0.14;
  s.addShape("ellipse" as any, { x: PAD, y: s2Y, w: cs, h: cs, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText("2", { x: PAD, y: s2Y, w: cs, h: cs, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  s.addText("Functionality in Console", { x: textX, y: s2Y, w: textW, h: 0.28, fontSize: 13, bold: true, color: "111827" });
  s.addText("Tracks integration of desired functionality through Jira engineering epics tagged with the acquired company, synced weekly. Only completed epics count toward the score — in-progress and to-do are tracked for visibility but carry zero weight.", {
    x: textX, y: s2Y + 0.3, w: textW, h: 0.45, fontSize: 10, color: GREY_MUTED, wrap: true,
  });

  // Epic status mapping
  const epicBoxY = s2Y + 0.82;
  const epicBoxH = SLIDE_H - epicBoxY - PAD;
  s.addShape("roundRect" as any, { x: textX, y: epicBoxY, w: textW, h: epicBoxH, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", pt: 1 }, rectRadius: 0.07 });
  s.addText("EPIC STATUS MAPPING", { x: textX + 0.2, y: epicBoxY + 0.12, w: textW - 0.4, h: 0.2, fontSize: 8, bold: true, color: GREY_MUTED });

  const epicRows = [
    { color: "10B981", label: "Complete",    statuses: "Closed, Done" },
    { color: NAVY,     label: "In Progress", statuses: "In Development" },
    { color: "CBD5E1", label: "To Do",       statuses: "To Do, Building Requirements, Ready for Ticketing, Ready for Development" },
  ];
  epicRows.forEach((er, i) => {
    const erY = epicBoxY + 0.42 + i * 0.32;
    s.addShape("ellipse" as any, { x: textX + 0.2, y: erY + 0.06, w: 0.13, h: 0.13, fill: { color: er.color }, line: { color: er.color } });
    s.addText(er.label, { x: textX + 0.42, y: erY, w: 1.3, h: 0.26, fontSize: 10, bold: true, color: "374151" });
    s.addText(er.statuses, { x: textX + 1.76, y: erY, w: textW - 1.96, h: 0.26, fontSize: 9.5, color: GREY_MUTED });
  });
}

function buildMethodologyClientMigration(pptx: pptxgenjs, s: pptxgenjs.Slide) {
  addMethodologyHeader(pptx, s, "Client Migration");
  const ct = HEADER_H + PAD;
  const cw = SLIDE_W - PAD * 2;
  const cs = 0.32;

  s.addText("Measures how many clients from an acquired platform are moving into the Capacity console. This lane is not always applicable.", {
    x: PAD, y: ct, w: cw, h: 0.35, fontSize: 14, color: GREY_MUTED,
  });

  // Not-applicable amber box
  const amberY = ct + 0.4;
  const amberH = 1.15;
  s.addShape("roundRect" as any, { x: PAD, y: amberY, w: cw, h: amberH, fill: { color: "FFFBEB" }, line: { color: "FDE68A", pt: 1 }, rectRadius: 0.07 });
  s.addText("When Client Migration is Not Applicable", { x: PAD + 0.2, y: amberY + 0.1, w: cw - 0.4, h: 0.32, fontSize: 18, bold: true, color: "92400E" });
  s.addText("• Clients are on private cloud infrastructure and not migrating to Capacity SaaS\n• A distinct, separate experience is intentionally being maintained\n• Client migrations are simply not part of the integration plan", {
    x: PAD + 0.3, y: amberY + 0.46, w: cw - 0.5, h: 0.6, fontSize: 13, color: "B45309", wrap: true,
  });

  // Two step columns
  const stepsTop = amberY + amberH + 0.22;
  const colW = (cw - PAD) / 2;

  // -- Step 1
  s.addShape("ellipse" as any, { x: PAD, y: stepsTop, w: cs, h: cs, fill: { color: "059669" }, line: { color: "059669" } });
  s.addText("1", { x: PAD, y: stepsTop, w: cs, h: cs, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  const t1X = PAD + cs + 0.15; const t1W = colW - cs - 0.2;
  s.addText("Clients With Access to Console", { x: t1X, y: stepsTop, w: t1W, h: 0.34, fontSize: 18, bold: true, color: "111827" });
  s.addText("Measures how many clients have been provisioned access to the Capacity console, determined by matching the client's original platform instance to an active org instance in Capacity — indicating they have been onboarded and have access, even if not yet active.", {
    x: t1X, y: stepsTop + 0.37, w: t1W, h: 0.75, fontSize: 13, color: GREY_MUTED, wrap: true,
  });

  // -- Step 2
  const s2X = PAD + colW + PAD;
  s.addShape("ellipse" as any, { x: s2X, y: stepsTop, w: cs, h: cs, fill: { color: "059669" }, line: { color: "059669" } });
  s.addText("2", { x: s2X, y: stepsTop, w: cs, h: cs, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
  const t2X = s2X + cs + 0.15; const t2W = colW - cs - 0.2;
  s.addText("Clients Active in the Console", { x: t2X, y: stepsTop, w: t2W, h: 0.34, fontSize: 18, bold: true, color: "111827" });
  s.addText("A client is considered Active when 2 or more of the following usage metrics have a recorded value greater than 1:", {
    x: t2X, y: stepsTop + 0.37, w: t2W, h: 0.5, fontSize: 13, color: GREY_MUTED, wrap: true,
  });

  // Usage metric badges — sized for 11pt text
  const metrics = ["Active Users", "Auth Active Users", "Automations", "Conversations", "Inquiries", "Tickets", "Voice Minutes", "Workflows"];
  let bx = t2X; let by = stepsTop + 0.95; const badgeH = 0.28;
  metrics.forEach((m) => {
    const bw = m.length * 0.088 + 0.28;
    if (bx + bw > t2X + t2W) { bx = t2X; by += badgeH + 0.08; }
    s.addShape("roundRect" as any, { x: bx, y: by, w: bw, h: badgeH, fill: { color: "F1F5F9" }, line: { color: "E2E8F0", pt: 1 }, rectRadius: 0.05 });
    s.addText(m, { x: bx, y: by, w: bw, h: badgeH, fontSize: 11, color: "374151", align: "center", valign: "middle" });
    bx += bw + 0.08;
  });

  // Formula bar at bottom
  const formulaY = SLIDE_H - 0.52;
  s.addShape("roundRect" as any, { x: PAD, y: formulaY, w: cw, h: 0.38, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", pt: 1 }, rectRadius: 0.07 });
  s.addText("Client Migration Score  =  ( Access % + Active % ) ÷ 2", {
    x: PAD + 0.2, y: formulaY, w: cw - 0.4, h: 0.38, fontSize: 12, bold: true, color: "374151", valign: "middle",
  });
}

function buildMethodologyDataSources(pptx: pptxgenjs, s: pptxgenjs.Slide) {
  addMethodologyHeader(pptx, s, "Data Sources & Sync Schedule");
  const ct = HEADER_H + PAD;
  const cw = SLIDE_W - PAD * 2;
  const colW = (cw - PAD * 2) / 3;
  const colH = SLIDE_H - ct - PAD;

  const sources = [
    {
      color: "10B981", title: "Vitally — Nightly", schedule: "Every night at 12:00 AM CT",
      body: "Pulls all accounts from Vitally and populates client counts and console access status based on ARR field values.\n\nClients with a matching org instance in Capacity are marked as having console access.\n\nChurned clients (ARR dropped to $0) are flagged rather than deleted, preserving history.",
    },
    {
      color: "3B82F6", title: "Jira — Weekly (Fridays)", schedule: "Every Friday at 11:30 PM CT",
      body: "Pulls all acquisition-tagged Epics from the PROJ Jira project and updates epic counts (To Do / In Progress / Complete) for each acquisition.\n\nOnly epics created on or after January 1, 2024 are included. Epics with removed tags are automatically cleaned up on the next sync.",
    },
    {
      color: "8B5CF6", title: "Core API — Monthly", schedule: "Manual sync, monthly cadence",
      body: "Fetches product usage metrics and updates the Active in Console status for each matched client.\n\nA client is marked Active when 2 or more usage metrics (Active Users, Automations, Conversations, etc.) have a value greater than 1.\n\nRespects the Manual Sync and Client Metrics Applicable flags on each acquisition.",
    },
  ];

  sources.forEach((src, i) => {
    const colX = PAD + i * (colW + PAD);
    s.addShape("roundRect" as any, { x: colX, y: ct, w: colW, h: colH, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", pt: 1 }, rectRadius: 0.1 });
    s.addShape("ellipse" as any, { x: colX + 0.22, y: ct + 0.24, w: 0.13, h: 0.13, fill: { color: src.color }, line: { color: src.color } });
    s.addText(src.title, { x: colX + 0.43, y: ct + 0.16, w: colW - 0.55, h: 0.28, fontSize: 12, bold: true, color: "111827" });
    s.addShape("roundRect" as any, { x: colX + 0.2, y: ct + 0.54, w: colW - 0.4, h: 0.24, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", pt: 1 }, rectRadius: 0.05 });
    s.addText(src.schedule, { x: colX + 0.2, y: ct + 0.54, w: colW - 0.4, h: 0.24, fontSize: 9, color: GREY_MUTED, align: "center", valign: "middle" });
    s.addText(src.body, { x: colX + 0.2, y: ct + 0.9, w: colW - 0.4, h: colH - 1.05, fontSize: 10, color: "374151", wrap: true, valign: "top" });
  });
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
      buildTrackerSlide(pptx, s, slide.data as AcquisitionData);
    } else if (slide.sectionId === "methodology-end-states") {
      buildMethodologyEndStates(pptx, s);
    } else if (slide.sectionId === "methodology-overall-progress") {
      buildMethodologyOverallProgress(pptx, s);
    } else if (slide.sectionId === "methodology-technical") {
      buildMethodologyTechnical(pptx, s);
    } else if (slide.sectionId === "methodology-client-migration") {
      buildMethodologyClientMigration(pptx, s);
    } else if (slide.sectionId === "methodology-data-sources") {
      buildMethodologyDataSources(pptx, s);
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

        // Fit image within the content area preserving its natural aspect ratio.
        // Scale is determined by whichever dimension (width or height) is the
        // limiting factor so the image is never stretched or distorted.
        const imgW = slide.imageWidth || 1400;
        const imgH = slide.imageHeight || 900;
        const scale = Math.min(contentW / imgW, contentH / imgH);
        const scaledW = imgW * scale;
        const scaledH = imgH * scale;
        // Center within the content area
        const offsetX = PAD + (contentW - scaledW) / 2;
        const offsetY = HEADER_H + PAD + (contentH - scaledH) / 2;

        s.addImage({
          data: slide.imageData,
          x: offsetX, y: offsetY, w: scaledW, h: scaledH,
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
