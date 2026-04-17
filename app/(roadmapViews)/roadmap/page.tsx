"use client";

import React, { useState, useEffect } from 'react';
import { useRoadmap } from "@/context/roadmap-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryColor, formatDate } from "@/lib/utils/formatters";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RoadmapItemCard } from "@/components/roadmap-item-card";
import type { RoadmapItem } from "@/types/roadmap";

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
    focusedItemId,
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
                              {categoryMilestoneItems.map((item) => (
                                <RoadmapItemCard
                                  key={item.id}
                                  item={item}
                                  isEditor={isEditor}
                                  onEdit={(i) => openItemModal('edit', i)}
                                  onDelete={setPendingDeleteId}
                                  onFocusItem={setFocusedItemId}
                                />
                              ))}
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
               {focusedItemId && " (Focus active)"} 
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
