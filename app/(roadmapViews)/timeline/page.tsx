"use client";

import React, { useState } from 'react';
import { useRoadmap } from "../layout"; // Use the context hook
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoadmapItemCard } from "@/components/roadmap-item-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Lock, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { RoadmapItem } from "@/types/roadmap";
import { getCategoryColor, formatDate } from "@/lib/utils/formatters";

export default function TimelinePage() {
  // Consume context from the layout
  const {
    displayedItems,
    displayedMilestones,
    historicalMilestoneCount,
    showHistorical,
    toggleHistorical,
    isEditor,
    setFocusedItemId,
    categories,
    openItemModal,
    deleteItem,
  } = useRoadmap();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Actual handlers using context functions
  const handleAddItemClick = (milestoneId: string) => {
    openItemModal('create', milestoneId);
  };

  const handleEditClick = (item: RoadmapItem) => {
    openItemModal('edit', item);
  };

  const handleDeleteClick = (itemId: string) => {
    setPendingDeleteId(itemId);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteItem(pendingDeleteId);
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };
  
  return (
    <>
      {/* --- Historical Button (now driven by context/layout state) --- */} 
      {historicalMilestoneCount > 0 || showHistorical ? (
          <div className="mb-4">
            <Button variant="link" onClick={toggleHistorical} className="p-0 h-auto text-sm">
              <History className="mr-1 h-4 w-4" />
              {showHistorical 
                ? "Hide Historical Milestones" 
                : `View ${historicalMilestoneCount} Historical Milestone${historicalMilestoneCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        ) : null}
        
      {/* --- Timeline Rendering Logic (adapted from RoadmapTimeline) --- */}
      <div className="relative space-y-12">
        {displayedMilestones.length > 0 ? (
          <>
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            
            {/* Map over displayed milestones from context */} 
            {displayedMilestones.map((milestone) => {
              // Filter items for this milestone from context's displayedItems
              const milestoneItems = displayedItems.filter((item) => item.milestoneId === milestone.id);
              
              // Skip rendering milestone if no items AND focus is active (avoids empty sections in focus view)
              const { focusedItemId } = useRoadmap(); // Get focusedItemId inside the map if needed, or pass from parent scope
              if (milestoneItems.length === 0 && focusedItemId) return null; 

              return (
                <div key={milestone.id} className="relative pl-10">
                  {/* Milestone dot */}
                  <div className="absolute left-[12px] top-1.5 h-4 w-4 rounded-full bg-brand-navy border-2 border-background" />
                  
                  {/* Milestone Header */} 
                  <div className="mb-4">
                    <h3 className="text-xl font-bold flex items-center">
                      {milestone.title}
                      <span className="text-sm font-normal text-muted-foreground ml-2">({formatDate(milestone.date)})</span>
                      {/* Add Item Button (conditionally rendered, uses placeholder handler) */} 
                      {isEditor ? (
                        <Button variant="ghost" size="sm" className="ml-2" onClick={() => handleAddItemClick(milestone.id)} title="Add item functionality pending refactor"> 
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="ml-2 opacity-50" disabled>
                                <Lock className="h-4 w-4 mr-1" />
                                Add Item
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editor role required to add items</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </h3>
                  </div>
                  
                  {/* Category Cards Grid */} 
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => {
                      const categoryItems = milestoneItems.filter((item) => item.category === category);
                      if (categoryItems.length === 0) return null;
                      
                      return (
                        <Card key={`${milestone.id}-${category}`} className="overflow-hidden">
                           <div className={cn("h-1", getCategoryColor(category))} />
                          <div className="p-3 font-semibold flex items-center justify-between">
                            {category}
                            <Badge variant="outline">{categoryItems.length}</Badge>
                          </div>
                          <CardContent className="p-3 pt-0">
                            <ul className="space-y-2">
                              {categoryItems.map((item) => (
                                <RoadmapItemCard
                                  key={item.id}
                                  item={item}
                                  isEditor={isEditor}
                                  onEdit={handleEditClick}
                                  onDelete={handleDeleteClick}
                                  onFocusItem={setFocusedItemId}
                                />
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          // Message when no milestones are displayed
          <div className="text-center text-muted-foreground py-8">
            {showHistorical ? "No milestones found." : "No current or future milestones to display."}
            {/* Add message for focus view? */}
            {!!setFocusedItemId && "No items found for the current focus."}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 