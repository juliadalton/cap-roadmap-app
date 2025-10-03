"use client";

import React, { useState } from 'react';
import { useRoadmap } from "../layout"; // Use the context hook
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, ChevronDown, Plus, Lock, History, Link, Link2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapItem } from "@/types/roadmap"; // <-- Import RoadmapItem
import { getStatusColor, getCategoryColor, formatDate } from "@/lib/utils/formatters"; // <-- Import helpers

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

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Actual handlers using context functions
  const handleAddItemClick = (milestoneId: string) => {
    openItemModal('create', milestoneId);
  };

  const handleEditClick = (item: RoadmapItem) => {
    openItemModal('edit', item);
  };

  const handleDeleteClick = async (itemId: string) => {
    // Optional: Add a confirmation dialog here before calling deleteItem
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteItem(itemId);
        // Optionally show a success notification
      } catch (error) {
        console.error("Failed to delete item:", error);
        // Optionally show an error notification
      }
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
                  <div className="absolute left-[12px] top-1.5 h-4 w-4 rounded-full bg-[rgb(2_33_77)] border-2 border-background" />
                  
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
                              {categoryItems.map((item) => {
                                const hasMetrics = (item.pirateMetrics?.length || 0) > 0 || (item.northStarMetrics?.length || 0) > 0;
                                const hasDetails = hasMetrics || (item.relevantLinks && item.relevantLinks.length > 0) || (item.productDRI && item.productDRI.trim() !== "");
                                const isExpanded = expandedItems[item.id];
                                return (
                                <li key={item.id} className="flex items-start gap-2 group">
                                  <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", getStatusColor(item.status))} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium flex items-center">
                                      <span>{item.title}</span>
                                      {/* Link Icon (uses setFocusedItemId from context) */} 
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
                                                  href={typeof link === 'object' ? link.url : link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                  onClick={(e) => e.stopPropagation()}
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

                                        {/* Metrics Rendering (assuming types include these) */}
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
                                  {/* Edit/Delete Dropdown (uses placeholder handlers) */} 
                                  {isEditor ? (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit/Delete item"> 
                                            <ChevronDown className="h-4 w-4" />
                                            <span className="sr-only">Open menu</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleEditClick(item)}> 
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive" 
                                            onClick={() => handleDeleteClick(item.id)}
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
    </>
  );
} 