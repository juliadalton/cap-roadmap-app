"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useExportContent } from "@/context/export-content-context";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  Lightbulb, 
  Server,
  ArrowRight,
  ArrowDown,
  ListChecks,
  FileText,
  Search,
  CheckCircle2,
  ClipboardList,
  Calendar,
  Code,
  CheckCheck,
  PauseCircle,
  XCircle,
  ChevronRight
} from "lucide-react";

const lanes = [
  { 
    name: "New Revenue", 
    icon: TrendingUp, 
    color: "bg-emerald-500",
    lightColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-300"
  },
  { 
    name: "Retention", 
    icon: Users, 
    color: "bg-blue-500",
    lightColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300"
  },
  { 
    name: "Acquisition Integration", 
    icon: Building2, 
    color: "bg-violet-500",
    lightColor: "bg-violet-100 dark:bg-violet-900/30",
    textColor: "text-violet-700 dark:text-violet-300"
  },
  { 
    name: "Innovation & Competitiveness", 
    icon: Lightbulb, 
    color: "bg-amber-500",
    lightColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300"
  },
  { 
    name: "Platform Health", 
    icon: Server, 
    color: "bg-rose-500",
    lightColor: "bg-rose-100 dark:bg-rose-900/30",
    textColor: "text-rose-700 dark:text-rose-300"
  },
];

// PRP Process Status Configuration
const prpStatuses = {
  intake: [
    { name: "New", icon: FileText, color: "bg-slate-500", description: "Newly submitted request" },
  ],
  csReview: [
    { name: "CS/Revenue Review", icon: Search, color: "bg-blue-500", description: "Under review by CS/Revenue leaders" },
    { name: "CS/Revenue Qualify", icon: CheckCircle2, color: "bg-blue-600", description: "Being qualified and prioritized" },
  ],
  product: [
    { name: "Ready for Product", icon: ClipboardList, color: "bg-violet-500", description: "Qualified and ready for Product review" },
    { name: "Product Review", icon: Search, color: "bg-violet-600", description: "Product team reviewing and scoping" },
    { name: "Reviewed", icon: CheckCircle2, color: "bg-violet-700", description: "Scoping complete, awaiting scheduling" },
  ],
  execution: [
    { name: "Scheduled", icon: Calendar, color: "bg-emerald-500", description: "Prioritized and scheduled for development" },
    { name: "In Development", icon: Code, color: "bg-emerald-600", description: "Currently being developed" },
    { name: "Completed", icon: CheckCheck, color: "bg-emerald-700", description: "Development complete and delivered" },
  ],
  terminal: [
    { name: "On Hold", icon: PauseCircle, color: "bg-amber-500", description: "Temporarily paused" },
    { name: "Won't Do", icon: XCircle, color: "bg-rose-500", description: "Declined or no longer needed" },
  ],
};

// Priority Calculator Visualization
const priorityWeights = [
  { level: "Low", weight: 1, color: "bg-slate-400" },
  { level: "Medium", weight: 2, color: "bg-blue-500" },
  { level: "High", weight: 3, color: "bg-amber-500" },
  { level: "Critical", weight: 4, color: "bg-rose-500" },
];

function PriorityCalculatorVisualization() {
  return (
    <div className="w-full py-6 space-y-8">
      {/* Priority Weights Reference */}
      <div className="flex flex-wrap justify-center gap-4">
        {priorityWeights.map((p) => (
          <div key={p.level} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <div className={`w-3 h-3 rounded-full ${p.color}`} />
            <span className="text-sm font-medium">{p.level}</span>
            <span className="text-xs text-muted-foreground">= {p.weight} point{p.weight > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {/* Algorithm Steps */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Step 1 */}
        <div className="relative p-4 rounded-lg border bg-card">
          <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            Step 1
          </div>
          <h4 className="font-semibold mt-2 mb-2 text-sm">Count Open Issues By Priority</h4>
          <p className="text-xs text-muted-foreground">
            For each client, count their issues grouped by CS priority level
          </p>
        </div>

        {/* Step 2 */}
        <div className="relative p-4 rounded-lg border bg-card">
          <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            Step 2
          </div>
          <h4 className="font-semibold mt-2 mb-2 text-sm">Calculate Total Points</h4>
          <p className="text-xs text-muted-foreground">
            Sum(issue_count × priority_weight) for all client issues
          </p>
        </div>

        {/* Step 3 */}
        <div className="relative p-4 rounded-lg border bg-card">
          <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            Step 3
          </div>
          <h4 className="font-semibold mt-2 mb-2 text-sm">ARR Per Point</h4>
          <p className="text-xs text-muted-foreground">
            Divide client ARR by total points to get value per point
          </p>
        </div>

        {/* Step 4 */}
        <div className="relative p-4 rounded-lg border bg-card">
          <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            Step 4
          </div>
          <h4 className="font-semibold mt-2 mb-2 text-sm">Client Contribution</h4>
          <p className="text-xs text-muted-foreground">
            Each issue gets: priority_weight × ARR_per_point from that client
          </p>
        </div>

        {/* Step 5 */}
        <div className="relative p-4 rounded-lg border bg-card">
          <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            Step 5
          </div>
          <h4 className="font-semibold mt-2 mb-2 text-sm">Final Score</h4>
          <p className="text-xs text-muted-foreground">
            Sum all client contributions for each issue
          </p>
        </div>
      </div>

      {/* Worked Example */}
      <div className="rounded-xl border bg-gradient-to-br from-muted/30 to-muted/10 p-6">
        <h4 className="font-semibold mb-6 flex items-center gap-2">
          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">EXAMPLE</span>
          Calculating Score for Issue PRP-100 (High Priority)
        </h4>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Client A */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-emerald-600 dark:text-emerald-400">Client A</h5>
              <span className="text-sm font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
                $100,000 ARR
              </span>
            </div>
            
            {/* Client A Issues */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issues</div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  2× High (3 pts each)
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  1× Medium (2 pts)
                </div>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-2 text-sm font-mono bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Points:</span>
                <span>(2 × 3) + (1 × 2) = <strong>8 pts</strong></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ARR per Point:</span>
                <span>$100k ÷ 8 = <strong>$12,500</strong></span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">High Issue Value:</span>
                <span>3 × $12,500 = <strong className="text-emerald-600 dark:text-emerald-400">$37,500</strong></span>
              </div>
            </div>
          </div>

          {/* Client B */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-blue-600 dark:text-blue-400">Client B</h5>
              <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                $50,000 ARR
              </span>
            </div>
            
            {/* Client B Issues */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issues</div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  1× High (3 pts)
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  2× Low (1 pt each)
                </div>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-2 text-sm font-mono bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Points:</span>
                <span>(1 × 3) + (2 × 1) = <strong>5 pts</strong></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ARR per Point:</span>
                <span>$50k ÷ 5 = <strong>$10,000</strong></span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">High Issue Value:</span>
                <span>3 × $10,000 = <strong className="text-blue-600 dark:text-blue-400">$30,000</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Score */}
        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">PRP-100 Final Score</span>
              <span className="text-lg">=</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-mono">
                $37,500
              </span>
              <span>+</span>
              <span className="px-3 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono">
                $30,000
              </span>
              <span>=</span>
              <span className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                $67,500
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insight */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Key Insight</h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This algorithm ensures that a client's ARR is distributed proportionally across their requests based on priority. 
            A client with high ARR but many requests will have that ARR spread across all their issues, 
            while a client with high ARR and few requests concentrates their value on those specific issues.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ status, bgClass, borderClass }: { 
  status: { name: string; icon: any; color: string; description: string }; 
  bgClass: string; 
  borderClass: string;
}) {
  const Icon = status.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bgClass} border-l-4 ${borderClass} cursor-help transition-all hover:scale-[1.02] hover:shadow-sm`}
        >
          <div className={`p-1.5 rounded ${status.color} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">{status.name}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <p className="text-sm">{status.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function PRPProcessFlow() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full py-6">
        {/* Main Flow */}
        <div className="flex flex-col gap-6">
          {/* Stage Headers */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Intake
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                CS/Revenue Triage
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Product Scoping
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                Execution
              </span>
            </div>
          </div>

          {/* Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {/* Intake Stage */}
            <div className="flex flex-col gap-2">
              {prpStatuses.intake.map((status) => (
                <StatusItem 
                  key={status.name} 
                  status={status} 
                  bgClass="bg-slate-100 dark:bg-slate-800"
                  borderClass="border-slate-500"
                />
              ))}
              <div className="flex justify-center py-2">
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 md:rotate-0" />
              </div>
            </div>

            {/* CS/Revenue Stage */}
            <div className="flex flex-col gap-2">
              {prpStatuses.csReview.map((status, idx) => (
                <React.Fragment key={status.name}>
                  <StatusItem 
                    status={status} 
                    bgClass="bg-blue-50 dark:bg-blue-900/20"
                    borderClass="border-blue-500"
                  />
                  {idx < prpStatuses.csReview.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="h-4 w-4 text-blue-400" />
                    </div>
                  )}
                </React.Fragment>
              ))}
              <div className="flex justify-center py-2">
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 md:rotate-0" />
              </div>
            </div>

            {/* Product Stage */}
            <div className="flex flex-col gap-2">
              {prpStatuses.product.map((status, idx) => (
                <React.Fragment key={status.name}>
                  <StatusItem 
                    status={status} 
                    bgClass="bg-violet-50 dark:bg-violet-900/20"
                    borderClass="border-violet-500"
                  />
                  {idx < prpStatuses.product.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="h-4 w-4 text-violet-400" />
                    </div>
                  )}
                </React.Fragment>
              ))}
              <div className="flex justify-center py-2">
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 md:rotate-0" />
              </div>
            </div>

            {/* Execution Stage */}
            <div className="flex flex-col gap-2">
              {prpStatuses.execution.map((status, idx) => (
                <React.Fragment key={status.name}>
                  <StatusItem 
                    status={status} 
                    bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                    borderClass="border-emerald-500"
                  />
                  {idx < prpStatuses.execution.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="h-4 w-4 text-emerald-400" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Terminal States */}
          <div className="mt-4 pt-4 border-t border-dashed">
            <div className="text-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Terminal States (Can occur at any stage)
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {prpStatuses.terminal.map((status) => {
                const Icon = status.icon;
                return (
                  <Tooltip key={status.name}>
                    <TooltipTrigger asChild>
                      <div 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-help transition-all hover:scale-[1.02] hover:shadow-sm ${
                          status.name === "On Hold" 
                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" 
                            : "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700"
                        }`}
                      >
                        <div className={`p-1.5 rounded ${status.color} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{status.name}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{status.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PriorityFunnel() {
  return (
    <div className="w-full py-8">
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-4">
        {/* Input Lanes */}
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          {lanes.map((lane, index) => {
            const Icon = lane.icon;
            return (
              <div 
                key={lane.name}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${lane.lightColor} border-l-4 ${lane.color.replace('bg-', 'border-')}`}
              >
                <div className={`p-2 rounded-full ${lane.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`font-medium ${lane.textColor}`}>{lane.name}</span>
              </div>
            );
          })}
        </div>

        {/* Funnel Arrow Section */}
        <div className="flex items-center justify-center py-4 lg:py-0 lg:px-4">
          <svg 
            className="hidden lg:block w-32 h-48" 
            viewBox="0 0 120 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Funnel lines from each lane */}
            {lanes.map((lane, index) => {
              const startY = 20 + (index * 40);
              const colorClass = lane.color.replace('bg-', '');
              return (
                <path
                  key={lane.name}
                  d={`M 0 ${startY} Q 60 ${startY} 100 100`}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                  fill="none"
                  className={lane.textColor}
                />
              );
            })}
            {/* Arrow head */}
            <polygon 
              points="100,90 120,100 100,110" 
              fill="currentColor" 
              className="text-primary"
            />
            <line 
              x1="90" y1="100" x2="110" y2="100" 
              stroke="currentColor" 
              strokeWidth="3" 
              className="text-primary"
            />
          </svg>
          
          {/* Mobile arrow */}
          <div className="lg:hidden flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-0.5 h-8 bg-border" />
            <ArrowRight className="h-6 w-6 rotate-90 text-primary" />
            <div className="w-0.5 h-8 bg-border" />
          </div>
        </div>

        {/* Output: Roadmap */}
        <div className="w-full lg:w-72">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-primary text-primary-foreground">
                <ListChecks className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Roadmap Priorities</h3>
                <p className="text-sm text-muted-foreground">Quarterly & Long-term</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                {lanes.map((lane) => (
                  <div 
                    key={lane.name} 
                    className={`h-2 flex-1 rounded-full ${lane.color} opacity-60`} 
                    title={lane.name}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Prioritized based on impact & strategic alignment
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoadmapProcessPage() {
  const { registerPage, registerSection } = useExportContent();
  
  const prioritizationRef = useRef<HTMLDivElement>(null);
  const prpWorkflowRef = useRef<HTMLDivElement>(null);
  const priorityScoringRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    registerPage({
      id: 'roadmap-process',
      name: 'Roadmap Process',
      path: '/roadmap-process',
    });

    registerSection({
      id: 'roadmap-prioritization',
      pageId: 'roadmap-process',
      pageName: 'Roadmap Process',
      sectionName: 'Roadmap Prioritization',
      description: 'The five input lanes that feed into roadmap priorities',
      order: 1,
      elementRef: prioritizationRef.current,
    });

    registerSection({
      id: 'prp-workflow',
      pageId: 'roadmap-process',
      pageName: 'Roadmap Process',
      sectionName: 'PRP Process Workflow',
      description: 'Product Request Project workflow visualization',
      order: 2,
      elementRef: prpWorkflowRef.current,
    });

    registerSection({
      id: 'priority-scoring',
      pageId: 'roadmap-process',
      pageName: 'Roadmap Process',
      sectionName: 'Priority Scoring Algorithm',
      description: 'How we calculate priority scores for requests',
      order: 3,
      elementRef: priorityScoringRef.current,
    });
  }, [mounted, registerPage, registerSection]);

  return (
    <div className="space-y-6">
      {/* Priority Lanes Section */}
      <div ref={prioritizationRef} data-export-section="roadmap-prioritization">
        <Card>
          <CardHeader>
            <CardTitle>Roadmap Prioritization</CardTitle>
            <CardDescription>The lenses we use to build our roadmap.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Our roadmap priorities are developed by evaluating requests from five key input lanes. 
              Each lane represents a strategic focus area that feeds into our quarterly and long-term planning.
            </p>
            
            <PriorityFunnel />
            
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lanes.map((lane) => {
                const Icon = lane.icon;
                return (
                  <div 
                    key={lane.name}
                    className={`p-4 rounded-lg border ${lane.lightColor}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-5 w-5 ${lane.textColor}`} />
                      <h4 className={`font-semibold ${lane.textColor}`}>{lane.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lane.name === "New Revenue" && "Features and enhancements that drive new business opportunities and revenue growth."}
                      {lane.name === "Retention" && "Improvements focused on customer satisfaction, reducing churn, and increasing lifetime value."}
                      {lane.name === "Acquisition Integration" && "Integration work for acquired companies and their technology platforms."}
                      {lane.name === "Innovation & Competitiveness" && "Forward-looking features that keep us ahead of market trends and competition."}
                      {lane.name === "Platform Health" && "Technical debt reduction, performance improvements, and infrastructure reliability."}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PRP Process Workflow Section */}
      <div ref={prpWorkflowRef} data-export-section="prp-workflow">
        <Card>
          <CardHeader>
            <CardTitle>PRP Process</CardTitle>
            <CardDescription>How requests get into near-term sprints or the quarterly roadmap.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              The Product Request Project (PRP) Process manages requests submitted by Client Success and Revenue teams. 
              Requests flow through a structured review process where CS/Revenue leaders assess validity, 
              qualify items, and assign initial priority before handing off to Product for scoping and scheduling.
            </p>
            
            <PRPProcessFlow />
          </CardContent>
        </Card>
      </div>

      {/* Priority Scoring Section */}
      <div ref={priorityScoringRef} data-export-section="priority-scoring">
        <Card>
          <CardHeader>
            <CardTitle>Priority Scoring Algorithm</CardTitle>
            <CardDescription>How we calculate priority scores for requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3">
              When clients are tagged on a request, we calculate a weighted priority score using ARR-based point allocation. 
              This ensures requests are prioritized based on both urgency and business impact.
            </p>
            <p className="text-muted-foreground mb-6">
              When the request is for new revenue and prospects, we evaluate the Estimated Pipeline revenue number provided.
            </p>
            <PriorityCalculatorVisualization />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
