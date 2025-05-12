"use client"

import { useState, useEffect } from "react"
import { Edit, Trash2, ChevronDown, ChevronUp, Plus, Lock, History, Link, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { RoadmapItem, Milestone } from "@/types/roadmap"
import { EditorViewTable } from "@/components/editor-view-table"
import RoadmapView from "@/components/RoadmapView"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Define RoadmapViewType locally
type RoadmapViewType = "timeline" | "category" | "editor" | "roadmap"

interface RoadmapTimelineProps {
  items: RoadmapItem[]
  milestones: Milestone[]
  onEdit: (item: RoadmapItem) => void
  onDelete: (id: string) => void
  onAddItem: (milestoneId: string) => void
  onSave: (item: RoadmapItem) => void
  isEditor: boolean
  currentView: RoadmapViewType
  onViewChange: (view: RoadmapViewType) => void
  onFocusItem: (itemId: string | null) => void
  focusedItemId: string | null
  allItems: RoadmapItem[]
}

export default function RoadmapTimeline({
  items,
  milestones,
  onEdit,
  onDelete,
  onAddItem,
  onSave,
  isEditor,
  currentView,
  onViewChange,
  onFocusItem,
  focusedItemId,
  allItems,
}: RoadmapTimelineProps) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showHistorical, setShowHistorical] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All")

  useEffect(() => {
    if (!isEditor && currentView === 'editor') {
      onViewChange('timeline');
    }
  }, [isEditor, currentView, onViewChange]);

  useEffect(() => {
    if (currentView !== 'timeline') {
      setShowHistorical(false);
    }
  }, [currentView]);

  const categories = ["Product", "AI", "Integrations", "Branding", "Migrations"];

  // --- Calculate sorted/displayed milestones and count ONCE in component scope --- 
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
  });
  const displayedMilestones = showHistorical
    ? sortedMilestones
    : sortedMilestones.filter(milestone => {
        const milestoneDate = new Date(milestone.date);
        milestoneDate.setHours(0, 0, 0, 0);
        return milestoneDate >= today;
    });
  const historicalMilestoneCount = sortedMilestones.length - displayedMilestones.length;
  // --- End of component scope calculations --- 

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "in-progress":
        return "bg-amber-500"
      case "planned":
        return "bg-slate-500"
      default:
        return "bg-slate-300"
    }
  }

  const getCategoryColor = (category: string) => {
    // Updated category colors (adjust colors as needed)
    switch (category) {
      case "Product":
        return "bg-blue-500"; // Keep Product as blue
      case "AI":
        return "bg-[rgb(5_174_25)]"; // Update AI color
      case "Integrations":
        return "bg-[rgb(255_159_0)]"; // Update Integrations color
      case "Branding":
        return "bg-purple-500"; // New category color
      case "Migrations":
        return "bg-[rgb(154_169_191)]"; // New category color
      default:
        // Fallback for any categories not explicitly defined (e.g., from older data)
        return "bg-gray-400"; 
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
  }

  const toggleHistorical = () => {
    setShowHistorical(!showHistorical)
  }

  // Timeline View - Group items by milestone
  const renderTimelineView = () => {
    return (
      <>
        {/* Toggle Button only if there are historical milestones or if currently showing */}
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
        
        <div className="relative space-y-12">
          {displayedMilestones.length > 0 ? (
            <>
              {/* Timeline line - Adjust left position slightly if needed, or keep as is */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
              {/* Map over displayed milestones */}
              {displayedMilestones.map((milestone) => {
                const milestoneItems = items.filter((item) => item.milestoneId === milestone.id)
                return (
                  <div key={milestone.id} className="relative pl-10">
                    {/* Milestone dot - Updated background color */}
                    <div className="absolute left-[12px] top-1.5 h-4 w-4 rounded-full bg-[rgb(2_33_77)] border-2 border-background" />
                    {/* Milestone Header (Title, Add Button) */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold flex items-center">
                        {milestone.title}
                        <span className="text-sm font-normal text-muted-foreground ml-2">({formatDate(milestone.date)})</span>
                        {isEditor ? (
                          <Button variant="ghost" size="sm" className="ml-2" onClick={() => onAddItem(milestone.id)}>
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
                        const categoryItems = milestoneItems.filter((item) => item.category === category)
                        if (categoryItems.length === 0) return null
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
                                  <li key={item.id} className="flex items-start gap-2 group">
                                    <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", getStatusColor(item.status))} />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium flex items-center">
                                        <span>{item.title}</span>
                                        {(item.relatedItems?.length || 0) + (item.relatedTo?.length || 0) > 0 && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"
                                                  onClick={(e) => { e.stopPropagation(); onFocusItem(item.id); }}
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
                                      
                                      {/* Render Pirate Metrics Badges with Label */}
                                      {(item.pirateMetrics && item.pirateMetrics.length > 0) && (
                                        <div className="mt-2"> {/* Add margin top for spacing */} 
                                          <div className="text-xs font-medium text-muted-foreground mb-1">Pirate Metrics:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {item.pirateMetrics.map(metric => (
                                              <Badge key={metric} className="bg-[rgb(211_220_230)] text-foreground hover:bg-[rgb(211_220_230)]/80 text-xs px-1.5 py-0">{metric}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Render North Star Metrics Badges with Label */}
                                      {(item.northStarMetrics && item.northStarMetrics.length > 0) && (
                                         <div className="mt-2"> {/* Add margin top for spacing */} 
                                          <div className="text-xs font-medium text-muted-foreground mb-1">North Star Metrics:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {item.northStarMetrics.map(metric => (
                                              <Badge key={metric} className="bg-[rgb(211_220_230)] text-foreground hover:bg-[rgb(211_220_230)]/80 text-xs px-1.5 py-0">{metric}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
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
                                            <DropdownMenuItem onClick={() => onEdit(item)}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() => onDelete(item.id)}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            // Message when no milestones are displayed
            <div className="text-center text-muted-foreground py-8">
              {showHistorical ? "No milestones found." : "No current or future milestones to display."}
            </div>
          )}
        </div>
      </>
    )
  }

  // Category View - Group items by category
  const renderCategoryView = () => {
    const filteredCategories = categories.filter(category => 
      selectedCategoryFilter === "All" || selectedCategoryFilter === category
    );
    const anyVisibleItemsExist = items.some(item => 
        displayedMilestones.some(m => m.id === item.milestoneId) && 
        filteredCategories.includes(item.category)
    );

    return (
      <div className="space-y-8">
        {/* Restore Historical Toggle Button to the top left */}
        {(historicalMilestoneCount > 0 || showHistorical) && milestones.length > 0 ? (
           <div className="mb-4"> {/* Standard positioning */}
             <Button variant="link" onClick={toggleHistorical} className="p-0 h-auto text-sm">
               <History className="mr-1 h-4 w-4" />
               {showHistorical 
                 ? "Hide Historical Milestones" 
                 : `View ${historicalMilestoneCount} Historical Milestone${historicalMilestoneCount !== 1 ? 's' : ''}`}
             </Button>
           </div>
        ) : null}

        {/* Map through FILTERED Categories */}
        {filteredCategories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category)
          const visibleItemsInCategory = categoryItems.filter(item => 
             displayedMilestones.some(m => m.id === item.milestoneId)
          );
          if (visibleItemsInCategory.length === 0) return null;

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
               {/* Restore Category Header */}
               <div className={cn("h-1", getCategoryColor(category))} />
               <div className="p-4 font-medium text-lg flex items-center justify-between">
                 {category}
                 <Badge variant="outline">
                    {visibleItemsInCategory.length}
                    {showHistorical && visibleItemsInCategory.length !== categoryItems.length ? ` / ${categoryItems.length}` : ''}
                 </Badge>
               </div>
               {/* Milestones within Category */}
               <div className="px-4 pb-4">
                 <div className="space-y-4">
                   {displayedMilestones.map((milestone) => {
                     const milestoneItemsInCategory = visibleItemsInCategory.filter((item) => item.milestoneId === milestone.id)
                     if (milestoneItemsInCategory.length === 0) return null
                     return (
                       <Card key={`${category}-${milestone.id}`} className="overflow-hidden">
                          {/* Restore Milestone header */} 
                           <div className="p-3 font-medium flex items-center justify-between bg-[rgb(240_244_249)] dark:bg-muted/50">
                              {milestone.title}
                              <span className="text-sm font-normal text-muted-foreground">
                                {formatDate(milestone.date)}
                              </span>
                           </div>
                           {/* Restore Items List */}
                          <CardContent className="p-3">
                             <ul className="space-y-2">
                                {milestoneItemsInCategory.map((item) => (
                                  <li key={item.id} className="flex items-start gap-2 group">
                                     {/* Restore item details */}
                                     <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", getStatusColor(item.status))} />
                                     <div className="flex-1 min-w-0">
                                       <div className="font-medium flex items-center">
                                          <span>{item.title}</span>
                                          {(item.relatedItems?.length || 0) + (item.relatedTo?.length || 0) > 0 && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"
                                                    onClick={(e) => { e.stopPropagation(); onFocusItem(item.id); }}
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
                                       {/* Render Pirate Metrics Badges with Label */}
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
                                      {/* Render North Star Metrics Badges with Label */}
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
                                     {/* Corrected Edit/Delete Dropdown for Category View */}
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
                                            <DropdownMenuItem onClick={() => onEdit(item)}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() => onDelete(item.id)}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                             </ul>
                          </CardContent>
                       </Card>
                     )
                   })}
                 </div>
               </div>
             </div>
          )
        })}

        {/* Message if no categories/items are visible */}
        {!anyVisibleItemsExist && (
             <div className="text-center text-muted-foreground py-8">
                {selectedCategoryFilter !== "All" 
                    ? `No items found in the "${selectedCategoryFilter}" category for the selected milestones.`
                    : showHistorical 
                       ? "No items found in any category for the selected milestones." 
                       : "No items found in any category for current or future milestones."}
             </div>
        )}
      </div>
    )
  }

  // Use the EditorViewTable component for editor view
  const renderEditorView = () => {
    return (
      <EditorViewTable
        items={items}
        milestones={milestones}
        onEditItem={onEdit}
        onDeleteItem={onDelete}
        isEditor={isEditor}
        sortDirection={sortDirection}
      />
    )
  }

  // Re-add the rendering logic for the new RoadmapView
  const renderHorizontalRoadmapView = () => {
    return (
        <RoadmapView
            items={items}          
            milestones={milestones}  
            sortDirection={sortDirection} 
            onEdit={onEdit}        
            onDelete={onDelete}      
            isEditor={isEditor}      
            showHistorical={showHistorical}
            onToggleHistorical={toggleHistorical}
            onFocusItem={onFocusItem}
        />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Tabs
          value={currentView}
          onValueChange={(v) => onViewChange(v as RoadmapViewType)}
          className={`w-[${isEditor ? '530px' : '400px'}] transition-[width] duration-200 ease-in-out`}
        >
          <TabsList className={cn("grid w-full", isEditor ? "grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger
              value="timeline"
              className="bg-[rgb(240_244_249)] dark:bg-muted data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Timeline View
            </TabsTrigger>
            <TabsTrigger
              value="category"
              className="bg-[rgb(240_244_249)] dark:bg-muted data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Category View
            </TabsTrigger>
            <TabsTrigger
              value="roadmap"
              className="bg-[rgb(240_244_249)] dark:bg-muted data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
             Roadmap View
            </TabsTrigger>
            {isEditor && (
              <TabsTrigger
                value="editor"
                className="bg-[rgb(240_244_249)] dark:bg-muted data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Editor View
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {/* Group for ALL right-aligned controls */}
        <div className="flex items-center gap-2">
            {/* Conditional Category Filter (only on Category View) */} 
            {currentView === 'category' && !focusedItemId && ( 
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}> 
                    <SelectTrigger id="category-filter-main" className="w-[180px]"> 
                        <SelectValue placeholder="Filter category..." /> 
                    </SelectTrigger> 
                    <SelectContent> 
                        <SelectItem value="All">All Categories</SelectItem> 
                        {categories.map(cat => ( 
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem> 
                        ))} 
                    </SelectContent> 
                </Select> 
            )}
            {/* Existing Sort Button */}
            <Button variant="outline" size="sm" onClick={toggleSortDirection}> 
                 {sortDirection === "asc" ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />} 
                 {sortDirection === "asc" ? "Earliest first" : "Latest first"} 
             </Button> 
        </div>
      </div>

      {/* --- Conditionally Render Row for Focus Indicator --- */} 
      {focusedItemId && (
          <div className="flex items-center justify-start mb-4 h-8"> 
             {/* Group for Focus Indicators */} 
             <div className="flex items-center gap-2"> 
                {/* Clear Focus Button */} 
                <Button variant="outline" size="sm" onClick={() => onFocusItem(null)}> 
                    <X className="mr-2 h-4 w-4" /> 
                    Clear Focus (Show All)
                </Button>
                {/* Focus Message */} 
                <p className="text-sm text-muted-foreground">
                    (Showing items related to: {allItems.find(i => i.id === focusedItemId)?.title || 'selected item'})
                </p>
             </div>
          </div>
      )}

      {/* Main view rendering container */}
      <div className="overflow-hidden"> 
          {currentView === "timeline"
            ? renderTimelineView()
            : currentView === "category"
              ? renderCategoryView()
              : currentView === "roadmap"
                ? renderHorizontalRoadmapView()
                : renderEditorView()}
      </div>
    </div>
  )
}
