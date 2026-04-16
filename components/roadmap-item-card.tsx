"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link,
  Link2,
  CheckCircle2,
  Clock,
  CircleDashed,
} from "lucide-react";
import type { RoadmapItem } from "@/types/roadmap";

function StatusIcon({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string }> = {
    completed: {
      icon: <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />,
      label: "Completed",
    },
    "in-progress": {
      icon: <Clock className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />,
      label: "In Progress",
    },
    planned: {
      icon: <CircleDashed className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />,
      label: "Planned",
    },
  };
  const { icon, label } = config[status] ?? {
    icon: <CircleDashed className="mt-0.5 h-3 w-3 shrink-0 text-slate-300" />,
    label: "Unknown",
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface RoadmapItemCardProps {
  item: RoadmapItem;
  isEditor: boolean;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => void;
  onFocusItem: (id: string) => void;
}

export function RoadmapItemCard({
  item,
  isEditor,
  onEdit,
  onDelete,
  onFocusItem,
}: RoadmapItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails =
    (item.productDRI != null && item.productDRI.trim() !== "") ||
    (item.relevantLinks != null && item.relevantLinks.length > 0) ||
    (item.pirateMetrics != null && item.pirateMetrics.length > 0) ||
    (item.northStarMetrics != null && item.northStarMetrics.length > 0);

  const hasRelatedItems =
    (item.relatedItems?.length ?? 0) + (item.relatedTo?.length ?? 0) > 0;

  return (
    <li className="flex items-start gap-2 group">
      <TooltipProvider delayDuration={300}>
        <StatusIcon status={item.status} />
      </TooltipProvider>

      <div className="flex-1 min-w-0">
        <div className="font-medium flex items-center">
          <span>{item.title}</span>
          {hasRelatedItems && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusItem(item.id);
                    }}
                  >
                    <Link className="h-3.5 w-3.5" />
                    <span className="sr-only">Show related items</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show related items</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-1">{item.description}</div>

        {hasDetails && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            {isExpanded ? "Hide" : "Show"} Details
          </Button>
        )}

        {isExpanded && (
          <div className="mt-1 space-y-2">
            {item.productDRI && item.productDRI.trim() !== "" && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Product DRI:</div>
                <div className="text-xs text-foreground">{item.productDRI}</div>
              </div>
            )}

            {item.relevantLinks && item.relevantLinks.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Relevant Links:</div>
                <div className="space-y-1">
                  {item.relevantLinks.map((link, index) => {
                    // Defensive: handle legacy plain-string values until data migration (4.5)
                    const isObj = typeof link === "object" && link !== null;
                    const href = isObj ? link.url : String(link);
                    const displayText = isObj
                      ? link.text || (link.url.length > 40 ? `${link.url.substring(0, 40)}...` : link.url)
                      : String(link).length > 40
                      ? `${String(link).substring(0, 40)}...`
                      : String(link);
                    return (
                      <a
                        key={index}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {displayText}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {item.pirateMetrics && item.pirateMetrics.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Pirate Metrics:</div>
                <div className="flex flex-wrap gap-1">
                  {item.pirateMetrics.map((metric) => (
                    <Badge
                      key={metric}
                      className="bg-brand-metric text-foreground hover:bg-brand-metric/80 text-xs px-1.5 py-0 h-4"
                    >
                      {metric}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {item.northStarMetrics && item.northStarMetrics.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">North Star Metrics:</div>
                <div className="flex flex-wrap gap-1">
                  {item.northStarMetrics.map((metric) => (
                    <Badge
                      key={metric}
                      className="bg-brand-metric text-foreground hover:bg-brand-metric/80 text-xs px-1.5 py-0 h-4"
                    >
                      {metric}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditor && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)} className="text-xs">
                <Edit className="mr-2 h-3 w-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive text-xs"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </li>
  );
}
