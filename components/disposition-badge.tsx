"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DISPOSITION_META } from "@/lib/constants/dispositions";
import type { Disposition } from "@/types/roadmap";

const DISPOSITION_COLORS: Record<Disposition, string> = {
  Affiliated: "border-blue-500 text-blue-600 dark:text-blue-400",
  Connected: "border-emerald-500 text-emerald-600 dark:text-emerald-400",
  Wrapped: "border-violet-500 text-violet-600 dark:text-violet-400",
  Migrated: "border-amber-500 text-amber-600 dark:text-amber-400",
};

interface DispositionBadgeProps {
  disposition: Disposition;
  showTooltip?: boolean;
  className?: string;
}

export function DispositionBadge({
  disposition,
  showTooltip = true,
  className,
}: DispositionBadgeProps) {
  const meta = DISPOSITION_META[disposition];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        showTooltip && "cursor-default",
        DISPOSITION_COLORS[disposition],
        className
      )}
    >
      {meta.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs text-center">
          {meta.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
