"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Edit, Trash2, ChevronDown, History, ChevronRight, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RoadmapItem, Milestone } from "@/types/roadmap"
import { useState } from "react"
import React from 'react'

// Define categories locally or receive as prop if dynamic
const categories = ["Product", "AI", "Integrations", "Branding", "Migrations"];

// Define helper functions locally or receive as props
const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-500"
    case "in-progress": return "bg-amber-500"
    case "planned": return "bg-slate-500"
    default: return "bg-slate-300"
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Product": return "bg-blue-500";
    case "AI": return "bg-[rgb(5_174_25)]";
    case "Integrations": return "bg-[rgb(255_159_0)]";
    case "Branding": return "bg-purple-500";
    case "Migrations": return "bg-[rgb(154_169_191)]";
    default: return "bg-gray-400";
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}


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

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

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
                             {categoryMilestoneItems.map((item) => {
                               const hasMetrics = (item.pirateMetrics && item.pirateMetrics.length > 0) || (item.northStarMetrics && item.northStarMetrics.length > 0);
                               const hasDetails = hasMetrics || (item.relevantLinks && item.relevantLinks.length > 0) || (item.productDRI && item.productDRI.trim() !== "");
                               const isExpanded = expandedItems[item.id];
                               return (
                                 <li key={item.id} className="flex items-start gap-2 group">
                                   <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", getStatusColor(item.status))} />
                                   <div className="flex-1 min-w-0">
                                     <div className="font-medium flex items-center">
                                        <span>{item.title}</span>
                                        {(item.relatedItems?.length || 0) + (item.relatedTo?.length || 0) > 0 && (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary" 
                                              onClick={(e) => { e.stopPropagation(); onFocusItem(item.id); }} 
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
                                     {/* Expand/Collapse Toggle */}
                                     {hasDetails && (
                                       <Button 
                                         variant="link" 
                                         size="sm" 
                                         onClick={() => toggleItemExpansion(item.id)}
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
                                          {/* Render Pirate Metrics */}
                                          {(item.pirateMetrics && item.pirateMetrics.length > 0) && (
                                           <div className="mt-1">
                                             <div className="flex flex-wrap gap-1">
                                               {item.pirateMetrics.map(metric => (
                                                 <Badge key={metric} className="bg-[rgb(211_220_230)] text-foreground hover:bg-[rgb(211_220_230)]/80 text-xs px-1.5 py-0 h-4">P: {metric}</Badge>
                                               ))}
                                             </div>
                                           </div>
                                         )}
                                         {/* Render North Star Metrics */}
                                         {(item.northStarMetrics && item.northStarMetrics.length > 0) && (
                                           <div className="mt-1">
                                             <div className="flex flex-wrap gap-1">
                                               {item.northStarMetrics.map(metric => (
                                                 <Badge key={metric} className="bg-[rgb(211_220_230)] text-foreground hover:bg-[rgb(211_220_230)]/80 text-xs px-1.5 py-0 h-4">N: {metric}</Badge>
                                               ))}
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                   {/* Edit/Delete Dropdown for Editor */}
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
                                             EDIT THIS THING
                                           </DropdownMenuItem>
                                           <DropdownMenuItem
                                             onClick={() => onDelete(item.id)}
                                             className="text-destructive focus:text-destructive text-xs"
                                           >
                                             <Trash2 className="mr-2 h-3 w-3" />
                                             Delete
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
