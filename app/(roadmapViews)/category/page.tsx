"use client";

import React, { useState } from 'react';
import { useRoadmap } from "../layout"; // Use context
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, Plus, Lock, History, Link, Link2, ChevronRight } from "lucide-react"; // Add needed icons
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // For item actions
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For link icon
import { getStatusColor, getCategoryColor, formatDate } from "@/lib/utils/formatters"; // <-- Import helpers

export default function CategoryPage() {
  const {
    displayedItems,
    displayedMilestones,
    historicalMilestoneCount,
    showHistorical,
    toggleHistorical,
    isEditor,
    setFocusedItemId,
    allItems, 
    focusedItemId,
    selectedCategoryFilter,
    categories,
    openItemModal,
    deleteItem
  } = useRoadmap();

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Memoize filtered categories to prevent re-calculation on every render
  const filteredCategories = React.useMemo(() => {
    return categories.filter(category => 
      selectedCategoryFilter === "All" || selectedCategoryFilter === category
    );
  }, [categories, selectedCategoryFilter]);

  // Check if any items exist for the *currently displayed* milestones and *filtered* categories
  const anyVisibleItemsExist = displayedItems.some(item => 
    filteredCategories.includes(item.category)
  );

  return (
    <div className="space-y-4"> {/* Reduced space-y */} 
      
      {/* --- REMOVED Controls Row: Historical Button and Category Filter are now separate or in layout --- */} 
      {/* Historical button rendering is now standalone */}
       {(historicalMilestoneCount > 0 || showHistorical) && displayedMilestones.length > 0 ? (
        <div className="mb-4"> 
          <Button variant="link" onClick={toggleHistorical} className="p-0 h-auto text-sm">
            <History className="mr-1 h-4 w-4" />
            {showHistorical 
              ? "Hide Historical Milestones" 
              : `View ${historicalMilestoneCount} Historical Milestone${historicalMilestoneCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      ) : <div className="h-5 mb-4"></div> /* Placeholder to prevent layout shift */}

      {/* --- Main Content: Map through FILTERED Categories --- */}
      {filteredCategories.map((category) => {
        // Items in this category (considering displayed items from context)
        const categoryItemsInView = displayedItems.filter((item) => item.category === category);
        
        if (categoryItemsInView.length === 0) return null; // Skip category if no items for current view/focus

        // Calculate total items in this category (for badge display when historical is shown)
        const totalCategoryItems = allItems.filter(item => item.category === category).length;

        return (
          <div key={category} className="border rounded-lg overflow-hidden">
            {/* Category Header */} 
            <div className={cn("h-1", getCategoryColor(category))} />
            <div className="p-4 font-medium text-lg flex items-center justify-between">
              {category}
              <Badge variant="outline">
                 {categoryItemsInView.length}
                 {/* Show total count only if historical differs and is active */}
                 {showHistorical && categoryItemsInView.length !== totalCategoryItems ? ` / ${totalCategoryItems}` : ''}
              </Badge>
            </div>
            
            {/* Milestones within Category */} 
            <div className="px-4 pb-4">
              <div className="space-y-4">
                {displayedMilestones.map((milestone) => {
                  // Filter items further for this specific milestone
                  const milestoneItemsInCategory = categoryItemsInView.filter((item) => item.milestoneId === milestone.id);
                  if (milestoneItemsInCategory.length === 0) return null; // Skip milestone if no items for this cat/view
                  
                  return (
                    <Card key={`${category}-${milestone.id}`} className="overflow-hidden">
                      {/* Milestone header */} 
                      <div className="p-3 font-medium flex items-center justify-between bg-[rgb(240_244_249)] dark:bg-muted/50">
                         {milestone.title}
                         <span className="text-sm font-normal text-muted-foreground">
                           {formatDate(milestone.date)}
                         </span>
                      </div>
                      {/* Items List */} 
                      <CardContent className="p-3">
                        <ul className="space-y-2">
                          {milestoneItemsInCategory.map((item) => {
                            const hasMetrics = (item.pirateMetrics?.length || 0) > 0 || (item.northStarMetrics?.length || 0) > 0;
                            const hasDetails = hasMetrics || (item.relevantLinks && item.relevantLinks.length > 0) || (item.productDRI && item.productDRI.trim() !== "");
                            const isExpanded = expandedItems[item.id];
                            return (
                            <li
                              key={item.id}
                              className="flex items-start gap-2 group"
                            >
                              <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", getStatusColor(item.status))} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium flex items-center">
                                  <span>{item.title}</span>
                                  {/* Link Icon */} 
                                  {(item.relatedItems?.length || 0) + (item.relatedTo?.length || 0) > 0 && (
                                      <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"
                                                onClick={(e) => { e.stopPropagation(); setFocusedItemId(item.id); }}
                                                title="Show related items"
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
                                              href={link} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Link2 className="h-3.5 w-3.5" />
                                              {link.length > 40 ? `${link.substring(0, 40)}...` : link}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Metrics Rendering - Copied and adapted from TimelinePage */} 
                                    {(item.pirateMetrics && item.pirateMetrics.length > 0) && (
                                      <div className="mt-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Pirate Metrics:</div>
                                        <div className="flex flex-wrap gap-1">
                                          {item.pirateMetrics.map(metric => (
                                            <Badge key={metric} className="bg-[rgb(211_220_230)] text-foreground hover:bg-[rgb(211_220_230)]/80 text-xs px-1.5 py-0">{metric}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {(item.northStarMetrics && item.northStarMetrics.length > 0) && (
                                       <div className="mt-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">North Star Metrics:</div>
                                        <div className="flex flex-wrap gap-1">
                                          {item.northStarMetrics.map(metric => (
                                            <Badge key={metric} className="bg-[rgb(211_220_230)] text-foreground hover:bg-[rgb(211_220_230)]/80 text-xs px-1.5 py-0">{metric}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Edit/Delete Dropdown */} 
                              {isEditor ? (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-8 w-8">
                                         <ChevronDown className="h-4 w-4" />
                                         <span className="sr-only">Open menu</span>
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                       <DropdownMenuItem onClick={() => openItemModal('edit', item)}>
                                         <Edit className="mr-2 h-4 w-4" />
                                         Edit
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                         className="text-destructive focus:text-destructive"
                                         onClick={() => deleteItem(item.id)}
                                       >
                                         <Trash2 className="mr-2 h-4 w-4" />
                                         Delete
                                       </DropdownMenuItem>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </div>
                               ) : null}
                            </li>
                          )})}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Message if no categories/items are visible */}
      {!anyVisibleItemsExist && (
           <div className="text-center text-muted-foreground py-8">
              {focusedItemId
                ? "No items found for the current focus."
                : selectedCategoryFilter !== "All" 
                  ? `No items found in the "${selectedCategoryFilter}" category for the selected milestones.`
                  : showHistorical 
                     ? "No items found in any category for the selected milestones." 
                     : "No items found in any category for current or future milestones."} 
            </div>
       )}
     </div>
   );
 }