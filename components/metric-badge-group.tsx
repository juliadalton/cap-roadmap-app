"use client";

import { Badge } from "@/components/ui/badge";

interface MetricBadgeGroupProps {
  label: string;
  metrics: string[] | null | undefined;
}

export function MetricBadgeGroup({ label, metrics }: MetricBadgeGroupProps) {
  if (!metrics || metrics.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {metrics.map((metric) => (
          <Badge
            key={metric}
            className="bg-brand-metric text-foreground hover:bg-brand-metric/80 text-xs px-1.5 py-0 h-4"
          >
            {metric}
          </Badge>
        ))}
      </div>
    </div>
  );
}
