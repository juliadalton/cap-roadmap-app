"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RoadmapItemCard } from "@/components/roadmap-item-card"
import { History } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCategoryColor, formatDate } from "@/lib/utils/formatters"
import { CATEGORIES } from "@/lib/constants/roadmap"
import type { RoadmapItem, Milestone } from "@/types/roadmap"
import React from 'react'

const categories: string[] = [...CATEGORIES];


interface RoadmapViewProps {
  items: RoadmapItem[]
  milestones: Milestone[]
  sortDirection: "asc" | "desc"
  onEdit: (item: RoadmapItem) => void
  onDelete: (id: string) => void
  isEditor: boolean
  showHistorical: boolean
  onToggleHistorical: () => void
  onFocusItem: (itemId: string | null) => void
}

export default function RoadmapView({
  items,
  milestones,
  sortDirection,
  onEdit,
  onDelete,
  isEditor,
  showHistorical,
  onToggleHistorical,
  onFocusItem,
}: RoadmapViewProps) {

  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return sortDirection === "asc" ? dateA - dateB : dateB - dateA
  })

  // Filter milestones based on showHistorical state
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const displayedMilestones = showHistorical
    ? sortedMilestones
    : sortedMilestones.filter(milestone => {
        const milestoneDate = new Date(milestone.date);
        milestoneDate.setHours(0, 0, 0, 0);
        return milestoneDate >= today;
    });
  const historicalMilestoneCount = sortedMilestones.length - displayedMilestones.length;

  // Check if any items exist for the displayed milestones
  const anyVisibleItemsExist = items.some(item => 
    displayedMilestones.some(m => m.id === item.milestoneId)
  );

  return (
    <div>
      {/* Add Historical Toggle Button Here */}
      {(historicalMilestoneCount > 0 || showHistorical) && milestones.length > 0 ? (
        <div className="mb-4"> 
          <Button variant="link" onClick={onToggleHistorical} className="p-0 h-auto text-sm">
            <History className="mr-1 h-4 w-4" />
            {showHistorical 
              ? "Hide Historical Milestones" 
              : `View ${historicalMilestoneCount} Historical Milestone${historicalMilestoneCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      ) : null}

      {/* Horizontal Timeline Row (Static - outside scroll) */}
      {displayedMilestones.length > 0 && (
        // Make timeline full width, remove padding/margin adjustments related to old scroll container
        <div className="relative flex space-x-4 h-8 mb-2 w-full"> 
          {/* Single Continuous Line (Adjust left/right to edges) */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
          
          {/* Map Milestones to create positioned dots within fixed-width segments */}
          {displayedMilestones.map((milestone, index) => (
            <div key={`timeline-${milestone.id}`} className="w-96 flex-shrink-0 relative"> 
               {/* Dot positioned absolutely at left edge */}
               <div 
                 className="absolute top-1/2 left-0 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-background flex-shrink-0 z-10"
                 title={`${milestone.title} (${formatDate(milestone.date)})`}
               ></div>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable Container for Columns ONLY */}
      <div className="overflow-x-auto pb-4 w-full"> 
        {/* Milestone Columns Row */}
        <div className="flex space-x-4 w-max"> {/* Add w-max, remove pr-4 */}
          {displayedMilestones.map((milestone) => {
             const milestoneItems = items.filter((item) => item.milestoneId === milestone.id)
             if (milestoneItems.length === 0) {
               // Keep placeholder for timeline alignment
               return <div key={`placeholder-${milestone.id}`} className="w-96 flex-shrink-0"></div>;
             }
             return (
               <Card key={milestone.id} className="w-96 flex-shrink-0"> 
                  {/* Restore CardHeader */}
                  <CardHeader className="pb-3 pt-4"> 
                     <CardTitle className="text-lg font-bold flex items-center justify-between">
                        <span>{milestone.title}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                           {formatDate(milestone.date)}
                        </span>
                     </CardTitle>
                  </CardHeader>
                  {/* Restore CardContent with category and item mapping */}
                  <CardContent className="space-y-4">
                     {categories.map((category) => {
                       const categoryMilestoneItems = milestoneItems.filter(
                         (item) => item.category === category
                       )
                       if (categoryMilestoneItems.length === 0) {
                         return null // Don't render category section if no items
                       }
                       return (
                         <div key={category} className="space-y-2">
                            {/* Category Color Bar */}
                            <div className={cn("h-1 mb-2", getCategoryColor(category))} />
                           {/* Category Header */}
                           <div className="flex items-center gap-2 px-1"> 
                              <h4 className="font-semibold">{category}</h4>
                              <Badge variant="outline" className="ml-auto h-5 px-1.5 text-xs">{categoryMilestoneItems.length}</Badge>
                           </div>
                           {/* Items List */}
                           <ul className="space-y-2 pl-4">
                             {categoryMilestoneItems.map((item) => (
                               <RoadmapItemCard
                                 key={item.id}
                                 item={item}
                                 isEditor={isEditor}
                                 onEdit={onEdit}
                                 onDelete={onDelete}
                                 onFocusItem={onFocusItem}
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

      {/* Messages (Static - outside scroll) */}
      <div className="flex mt-4"> {/* Removed pr-4, added margin-top */}
          {displayedMilestones.length === 0 && milestones.length > 0 && (
             <div className="text-center text-muted-foreground py-8 w-full">
               No milestones to display based on current filters (try viewing historical).
             </div>
          )}
          {displayedMilestones.length > 0 && !anyVisibleItemsExist && (
             <div className="text-center text-muted-foreground py-8 w-full">
               No items found for the displayed milestones.
             </div>
          )}
           {milestones.length === 0 && (
             <div className="text-center text-muted-foreground py-8 w-full">
               No milestones defined.
             </div>
          )}
       </div>

    </div> // End of main container
  )
}
