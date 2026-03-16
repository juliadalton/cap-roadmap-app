"use client";

import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DISPOSITION_META } from "@/lib/constants/dispositions";
import type { Disposition } from "@/types/roadmap";
import {
  Link2,
  CheckCircle2,
  Clock,
  Circle,
  Users,
  Activity,
  GitMerge,
  Plug,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExportContent } from "@/context/export-content-context";

// ── Disposition state progression ─────────────────────────────────────────────

const DISPOSITION_ORDER: Disposition[] = ["Affiliated", "Connected", "Wrapped", "Migrated"];

const DISPOSITION_COLORS: Record<Disposition, { badge: string; bg: string; border: string; icon: string }> = {
  Affiliated: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
  },
  Connected: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-500",
  },
  Wrapped: {
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "text-violet-500",
  },
  Migrated: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-500",
  },
};

const DISPOSITION_ICONS: Record<Disposition, React.ReactNode> = {
  Affiliated: <Link2 className="h-5 w-5" />,
  Connected: <Plug className="h-5 w-5" />,
  Wrapped: <Layers className="h-5 w-5" />,
  Migrated: <GitMerge className="h-5 w-5" />,
};

// ── Progress formula visualisation ────────────────────────────────────────────

function FormulaBlock({
  label,
  sublabel,
  color,
  icon,
}: {
  label: string;
  sublabel: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-3 text-center", color)}>
      <div className="mb-1">{icon}</div>
      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
    </div>
  );
}

// ── Epic status legend ─────────────────────────────────────────────────────────

function EpicStatusRow({
  color,
  label,
  statuses,
}: {
  color: string;
  label: string;
  statuses: string[];
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-0.5 h-3 w-3 shrink-0 rounded-full", color)} />
      <div>
        <span className="text-sm font-medium">{label}</span>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {statuses.map((s) => (
            <Badge key={s} variant="outline" className="text-xs font-normal">
              {s}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IntegrationMethodologyPage() {
  const { registerPage, registerSection } = useExportContent();

  const endStatesRef = useRef<HTMLDivElement>(null);
  const overallProgressRef = useRef<HTMLDivElement>(null);
  const technicalRef = useRef<HTMLDivElement>(null);
  const clientMigrationRef = useRef<HTMLDivElement>(null);
  const dataSourcesRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    registerPage({
      id: 'integration-methodology',
      name: 'Integration Methodology',
      path: '/integration-methodology',
    });

    registerSection({ id: 'methodology-end-states', pageId: 'integration-methodology', pageName: 'Integration Methodology', sectionName: 'Acquisition End States', description: 'Disposition spectrum from Affiliated to Migrated', order: 1, elementRef: endStatesRef.current });
    registerSection({ id: 'methodology-overall-progress', pageId: 'integration-methodology', pageName: 'Integration Methodology', sectionName: 'Overall Integration Progress', description: 'Formula combining Technical and Client scores', order: 2, elementRef: overallProgressRef.current });
    registerSection({ id: 'methodology-technical', pageId: 'integration-methodology', pageName: 'Integration Methodology', sectionName: 'Technical Integration', description: 'Dev Platform + Functionality in Console steps', order: 3, elementRef: technicalRef.current });
    registerSection({ id: 'methodology-client-migration', pageId: 'integration-methodology', pageName: 'Integration Methodology', sectionName: 'Client Migration', description: 'Clients with access and active in console', order: 4, elementRef: clientMigrationRef.current });
    registerSection({ id: 'methodology-data-sources', pageId: 'integration-methodology', pageName: 'Integration Methodology', sectionName: 'Data Sources & Sync Schedule', description: 'Vitally, Jira, and Core API sync details', order: 5, elementRef: dataSourcesRef.current });
  }, [mounted, registerPage, registerSection]);

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Hero intro */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Acquisition Integration Methodology</h1>
        <p className="mt-2 text-muted-foreground">
          This page describes how acquisition integration progress is defined, measured, and tracked
          across all company acquisitions. Progress is evaluated through two parallel lanes —
          <strong className="text-foreground"> Technical Integration</strong> and{" "}
          <strong className="text-foreground">Client Migration</strong> — combined into a single
          overall benchmark.
        </p>
      </div>

      {/* ── Section 1: Acquisition End States ── */}
      <div ref={endStatesRef} data-export-section="methodology-end-states"><Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-muted-foreground" />
            Acquisition End States
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every acquisition is assigned an <em>end state</em> — a disposition that describes the
            intended level of technical integration between the acquired platform and Capacity. These
            four states represent a spectrum from loosely affiliated to fully migrated.
          </p>
        </CardHeader>
        <CardContent>
          {/* Progression arrow row */}
          <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
            {DISPOSITION_ORDER.map((disposition, i) => {
              const meta = DISPOSITION_META[disposition];
              const colors = DISPOSITION_COLORS[disposition];
              return (
                <div key={disposition} className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <div
                    className={cn(
                      "flex-1 h-full rounded-lg border p-4 flex flex-col gap-2",
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className={cn("flex items-center gap-2", colors.icon)}>
                      {DISPOSITION_ICONS[disposition]}
                      <span className={cn("text-sm font-semibold px-2 py-0.5 rounded-full border", colors.badge)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                  {i < DISPOSITION_ORDER.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            The arrow indicates increasing depth of integration, but acquisitions are not required to
            progress through every state sequentially. End state reflects intended destination, not
            current progress.
          </p>
        </CardContent>
      </Card></div>

      {/* ── Section 2: Overall Progress Formula ── */}
      <div ref={overallProgressRef} data-export-section="methodology-overall-progress"><Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Overall Integration Progress
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The Overall Integration Progress percentage is a high-level benchmark calculated by
            averaging the Technical Integration score and the Client Migration score. When client
            migration is marked as <strong>Not Applicable</strong>, the overall score is based
            entirely on Technical Integration.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <FormulaBlock
              label="Technical Integration"
              sublabel="Dev Platform + % Epics Complete"
              color="bg-blue-50 border-blue-200"
              icon={<Plug className="h-5 w-5 text-blue-500" />}
            />
            <span className="text-2xl font-light text-muted-foreground">+</span>
            <FormulaBlock
              label="Client Migration"
              sublabel="Access + Active (if applicable)"
              color="bg-emerald-50 border-emerald-200"
              icon={<Users className="h-5 w-5 text-emerald-500" />}
            />
            <span className="text-2xl font-light text-muted-foreground">÷ 2</span>
            <span className="text-2xl font-light text-muted-foreground">=</span>
            <FormulaBlock
              label="Overall Progress"
              sublabel="Combined benchmark %"
              color="bg-slate-50 border-slate-200"
              icon={<Activity className="h-5 w-5 text-slate-500" />}
            />
          </div>

          {/* Progress bar mock */}
          <div className="mt-6 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Technical Integration</span>
                <span>50%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-blue-500" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Client Migration</span>
                <span>75%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>Overall Integration Progress</span>
                <span>63%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#02214D]" style={{ width: "63%" }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Example: (50% technical + 75% client) ÷ 2 = 63% overall
            </p>
          </div>
        </CardContent>
      </Card></div>

      {/* ── Section 3: Technical Integration ── */}
      <div ref={technicalRef} data-export-section="methodology-technical"><Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" />
            Technical Integration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Technical integration is evaluated across two steps. Together they make up 50% of the
            overall progress score.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#02214D] text-white text-sm font-bold">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Dev Platform Connected</h3>
              <p className="text-sm text-muted-foreground">
                The most fundamental measure of technical integration. This flag is set to{" "}
                <strong>Connected</strong> when a basic API integration and/or a concierge chatbot
                deployment has been established with the acquired platform. Until this is true, no
                meaningful technical integration has occurred.
              </p>
              <div className="flex gap-3 pt-1">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-emerald-700">Connected</span>
                  <span className="text-muted-foreground">— contributes 50% of Technical score</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <Circle className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-500">Not Connected</span>
                  <span className="text-muted-foreground">— contributes 0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#02214D] text-white text-sm font-bold">
              2
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold">Functionality in Console</h3>
              <p className="text-sm text-muted-foreground">
                This step tracks the integration of <em>desired functionality</em> from the acquired
                platform into the Capacity console. Not all features from every acquired product are
                targeted for integration — only those that have been deliberately scoped. Progress is
                measured through Jira engineering epics tagged with the acquired company, synced
                automatically every week.
              </p>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Epic Status Mapping
                </p>
                <div className="space-y-2.5">
                  <EpicStatusRow
                    color="bg-emerald-500"
                    label="Complete"
                    statuses={["Closed", "Done"]}
                  />
                  <EpicStatusRow
                    color="bg-[#02214D]"
                    label="In Progress"
                    statuses={["In Development"]}
                  />
                  <EpicStatusRow
                    color="bg-slate-300"
                    label="To Do"
                    statuses={["To Do", "Building Requirements", "Ready for Ticketing", "Ready for Development"]}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Only <strong>completed</strong> epics count toward the score — in-progress and
                to-do epics are tracked for visibility but do not contribute numerically. The
                percentage of completed epics out of all scoped epics contributes the remaining
                50% of the Technical Integration score.
              </p>
            </div>
          </div>
        </CardContent>
      </Card></div>

      {/* ── Section 4: Client Migration ── */}
      <div ref={clientMigrationRef} data-export-section="methodology-client-migration"><Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Client Migration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Client migration tracking measures how many clients from an acquired platform are moving
            into the Capacity console. This lane is not always applicable — see below for when it may
            be excluded.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Not Applicable callout */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">When Client Migration is Not Applicable</p>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>Clients are on private cloud infrastructure and not migrating to Capacity SaaS</li>
              <li>A distinct, separate experience is intentionally being maintained</li>
              <li>Client migrations are simply not part of the integration plan</li>
            </ul>
            <p className="text-xs text-amber-600 mt-2">
              When marked Not Applicable, the overall progress score is calculated from Technical
              Integration alone.
            </p>
          </div>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Clients With Access to Console</h3>
              <p className="text-sm text-muted-foreground">
                Measures how many clients from the acquired platform have been provisioned access to
                the Capacity console. This is determined by matching the client's original platform
                instance to the presence of an active org instance in Capacity — indicating they
                have been onboarded and have access, even if not yet active.
              </p>
              <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">
                  Client has a matching org instance in the Capacity console
                  <span className="ml-1 font-medium text-foreground">→ counted as having access</span>
                </span>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
              2
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Clients Active in the Console</h3>
              <p className="text-sm text-muted-foreground">
                Goes a step further than access — measures how many clients are demonstrating{" "}
                <em>meaningful usage</em> in the Capacity console. Activity data is sourced from
                product usage metrics matched to each client's org instance.
              </p>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Definition of Meaningful Activity
                </p>
                <p className="text-sm text-muted-foreground">
                  A client is considered <strong className="text-foreground">Active</strong> when{" "}
                  <strong className="text-foreground">2 or more</strong> of the following usage
                  metrics have a recorded value greater than 1:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Active Users",
                    "Auth Active Users",
                    "Automations",
                    "Conversations",
                    "Inquiries",
                    "Tickets",
                    "Voice Minutes",
                    "Workflows",
                  ].map((metric) => (
                    <Badge key={metric} variant="secondary" className="text-xs">
                      {metric}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Client migration formula */}
          <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Migration Score Calculation
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                Access %
              </span>
              <span className="text-muted-foreground">+</span>
              <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                Active %
              </span>
              <span className="text-muted-foreground">÷ 2 =</span>
              <span className="rounded bg-slate-200 px-2 py-1 font-medium text-slate-700">
                Client Migration Score
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Each metric is expressed as a percentage of total clients from the acquired platform.
              The two percentages are averaged to produce the Client Migration score.
            </p>
          </div>
        </CardContent>
      </Card></div>

      {/* ── Section 5: Data Sources ── */}
      <div ref={dataSourcesRef} data-export-section="methodology-data-sources"><Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Data Sources & Sync Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold">Vitally — Nightly</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pulls all accounts from Vitally at 12:00 AM CT. Populates{" "}
                <strong>client counts</strong> and <strong>console access</strong> status based on
                ARR field values and org instance matching.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold">Jira — Weekly (Fridays)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pulls all acquisition-tagged epics from the PROJ Jira project every Friday at
                11:30 PM CT. Updates <strong>epic counts</strong> (To Do / In Progress / Complete)
                for each acquisition.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-sm font-semibold">Core API — Manual</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usage metrics are synced manually on a monthly basis to fetch the latest usage data
                and update <strong>active client</strong> status.
              </p>
            </div>
          </div>
        </CardContent>
      </Card></div>

    </div>
  );
}
