"use client";

import React, { useState, useEffect } from 'react';
import { useRoadmap } from "../layout"; // Use context
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // For metrics popover if used
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // For metrics popover if used
import { Checkbox } from "@/components/ui/checkbox"; // For metrics popover if used
import { Edit, Trash2, ChevronDown, History, ChevronRight, Link, Link2, CheckCircle2, Clock, CircleDashed, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor, getCategoryColor, formatDate } from "@/lib/utils/formatters";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { RoadmapItem } from "@/types/roadmap";

function StatusIcon({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string }> = {
    completed:   { icon: <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />, label: "Completed" },
    "in-progress": { icon: <Clock className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />,       label: "In Progress" },
    planned:     { icon: <CircleDashed className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />,   label: "Planned" },
  };
  const { icon, label } = config[status] ?? { icon: <CircleDashed className="mt-0.5 h-3 w-3 shrink-0 text-slate-300" />, label: "Unknown" };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function RoadmapPage() {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    displayedItems,
    displayedMilestones,
    historicalMilestoneCount,
    showHistorical,
    toggleHistorical,
    isEditor,
    setFocusedItemId,
    allItems, // Need all items to calculate historical total
    allMilestones,
    categories, // <-- Destructure categories from context
    openItemModal, // <-- Destructure openItemModal from context
    deleteItem, // <-- Destructure deleteItem from context
    setHeaderActions,
  } = useRoadmap();

  // Register the customer-facing PDF download button in the page header (visible to all users)
  useEffect(() => {
    setHeaderActions(
      <a href="/Capacity_2026_Product_Roadmap.pdf" download="Capacity_2026_Product_Roadmap.pdf">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Customer Roadmap
        </Button>
      </a>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  // Local state for expanding item metrics (if keeping this feature)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Check if any items exist for the displayed milestones (used for messages)
  const anyVisibleItemsExist = displayedItems.length > 0;

  return (
    <div>
      {/* --- Historical Toggle Button --- */}
      {(historicalMilestoneCount > 0 || showHistorical) && allMilestones.length > 0 ? (
        <div className="mb-4"> 
          <Button variant="link" onClick={toggleHistorical} className="p-0 h-auto text-sm">
            <History className="mr-1 h-4 w-4" />
            {showHistorical 
              ? "Hide Historical Milestones" 
              : `View ${historicalMilestoneCount} Historical Milestone${historicalMilestoneCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      ) : null}

      {/* --- Wide content container --- */}
      <div>
        {/* --- Horizontal Timeline Row --- */}
        {displayedMilestones.length > 0 && (
          /* w-max ensures this container is as wide as its children (the milestones) */
          <div className="relative flex space-x-4 h-8 mb-2 w-max"> 
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
            {displayedMilestones.map((milestone) => (
              <div key={`timeline-${milestone.id}`} className="w-96 flex-shrink-0 relative"> 
                <div 
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-background flex-shrink-0 z-10"
                  title={`${milestone.title} (${formatDate(milestone.date)})`}
                ></div>
              </div>
            ))}
          </div>
        )}

        {/* --- Container for Milestone Columns --- */}
        <div className="flex space-x-4 w-max pb-4"> 
          {displayedMilestones.map((milestone) => {
             // Filter items for this milestone using displayedItems from context
             const milestoneItems = displayedItems.filter((item) => item.milestoneId === milestone.id);
             
              // Use placeholder if no items for this milestone in the current view
              if (milestoneItems.length === 0) {
                return <div key={`placeholder-${milestone.id}`} className="w-96 flex-shrink-0"></div>;
              }
              
             return (
               <Card key={milestone.id} className="w-96 flex-shrink-0"> 
                  <CardHeader className="pb-3 pt-4"> 
                     <CardTitle className="text-lg font-bold flex items-center justify-between">
                        <span>{milestone.title}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {formatDate(milestone.date)}
                        </span>
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {categories.map((category) => {
                        const categoryMilestoneItems = milestoneItems.filter((item) => item.category === category);
                        if (categoryMilestoneItems.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                              <div className={cn("h-1 mb-2", getCategoryColor(category))} />
                            <div className="flex items-center gap-2 px-1"> 
                                <h4 className="font-semibold">{category}</h4>
                                <Badge variant="outline" className="ml-auto h-5 px-1.5 text-xs">{categoryMilestoneItems.length}</Badge>
                            </div>
                            <ul className="space-y-2"> 
                              {categoryMilestoneItems.map((item) => {
                                const hasMetrics = (item.pirateMetrics?.length || 0) > 0 || (item.northStarMetrics?.length || 0) > 0;
                                const hasDetails = hasMetrics || (item.relevantLinks && item.relevantLinks.length > 0) || (item.productDRI && item.productDRI.trim() !== "");
                                const isExpanded = expandedItems[item.id];
                                return (
                                  <li key={item.id} className="flex items-start gap-2 group">
                                    <TooltipProvider delayDuration={300}>
                                      <StatusIcon status={item.status} />
                                    </TooltipProvider>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium flex items-center">
                                          <span>{item.title}</span>
                                          {/* Link Icon */} 
                                          {(item.relatedItems?.length || 0) + (item.relatedTo?.length || 0) > 0 && (
                                              <Button 
                                                variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"
                                                onClick={(e) => { e.stopPropagation(); setFocusedItemId(item.id); }}
                                                title="Show related items"
                                              >
                                                <Link className="h-3.5 w-3.5" />
                                                <span className="sr-only">Show related items</span>
                                              </Button>
                                          )}
                                        </div>
                                      {item.description && (
                                        <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
                                      )}
                                      {/* Expand/Collapse for Details */} 
                                      {hasDetails && (
                                          <Button 
                                            variant="link" size="sm" onClick={() => toggleItemExpansion(item.id)}
                                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                                          >
                                            {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                                            {isExpanded ? "Hide" : "Show"} Details
                                          </Button>
                                        )}
                                      {/* Conditionally Render Details */} 
                                      {isExpanded && (
                                        <div className="mt-1 space-y-1"> 
                                            {/* Product DRI */}
                                            {item.productDRI && item.productDRI.trim() !== "" && (
                                              <div className="mt-2">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Product DRI:</div>
                                                <div className="text-xs text-foreground">{item.productDRI}</div>
                                              </div>
                                            )}
                                            {/* Relevant Links */}
                                            {item.relevantLinks && item.relevantLinks.length > 0 && (
                                              <div className="mt-2">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Relevant Links:</div>
                                                <div className="space-y-1">
                                                  {item.relevantLinks.map((link, index) => (
                                                    <a 
                                                      key={index}
                                                      href={typeof link === 'object' ? link.url : link} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                      onClick={(e) => e.stopPropagation()} // Prevent card click-through
                                                    >
                                                      <Link2 className="h-3.5 w-3.5" />
                                                      {(() => {
                                                        if (typeof link === 'object' && link !== null && 'url' in link) {
                                                          const objLink = link as { url: string; text?: string };
                                                          return objLink.text || (objLink.url.length > 40 ? `${objLink.url.substring(0, 40)}...` : objLink.url);
                                                        } else {
                                                          const strLink = link as string;
                                                          return strLink.length > 40 ? `${strLink.substring(0, 40)}...` : strLink;
                                                        }
                                                      })()}
                                                    </a>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {(item.pirateMetrics && item.pirateMetrics.length > 0) && (
                                              <div className="mt-1">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Pirate Metrics:</div>
                                                <div className="flex flex-wrap gap-1">
                                                  {item.pirateMetrics.map(metric => (
                                                    <Badge key={metric} className="bg-brand-metric text-foreground hover:bg-brand-metric/80 text-xs px-1.5 py-0 h-4">{metric}</Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {(item.northStarMetrics && item.northStarMetrics.length > 0) && (
                                              <div className="mt-1">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">North Star Metrics:</div>
                                                <div className="flex flex-wrap gap-1">
                                                  {item.northStarMetrics.map(metric => (
                                                    <Badge key={metric} className="bg-brand-metric text-foreground hover:bg-brand-metric/80 text-xs px-1.5 py-0 h-4">{metric}</Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Edit/Delete Dropdown */}
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
                                            <DropdownMenuItem onClick={() => openItemModal('edit', item)} className="text-xs">
                                              <Edit className="mr-2 h-3 w-3" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive text-xs"
                                              onClick={() => setPendingDeleteId(item.id)}
                                            >
                                              <Trash2 className="mr-2 h-3 w-3" /> Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )
                      })}
                  </CardContent>
               </Card>
             )
          })}
        </div>
      </div>

      {/* --- Messages for Empty States --- */}
      <div className="flex mt-4">
          {displayedMilestones.length === 0 && allMilestones.length > 0 && (
             <div className="text-center text-muted-foreground py-8 w-full">
               No milestones to display based on current filters (try viewing historical).
             </div>
          )}
          {displayedMilestones.length > 0 && !anyVisibleItemsExist && (
             <div className="text-center text-muted-foreground py-8 w-full">
               No items found for the displayed milestones.
               {useRoadmap().focusedItemId && " (Focus active)"} 
             </div>
          )}
           {allMilestones.length === 0 && (
             <div className="text-center text-muted-foreground py-8 w-full">
               No milestones defined.
             </div>
          )}
       </div>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (pendingDeleteId) {
                  try { await deleteItem(pendingDeleteId); } catch (e) { console.error(e); }
                  setPendingDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
} 