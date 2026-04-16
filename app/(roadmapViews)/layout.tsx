"use client";

import React, { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ItemForm from "@/components/item-form";
import { MilestoneManagementModal } from "@/components/milestone-management-modal";
import SidebarNav from "@/components/sidebar-nav";
import { RoadmapProvider, useRoadmap } from "@/context/roadmap-context";

// --- Page title map ---

const pageTitles: Record<string, string> = {
  "/roadmap": "Company Roadmap",
  "/category": "Roadmap by Category",
  "/timeline": "Vertical Timeline",
  "/roadmap-process": "Roadmap Process",
  "/acquisitions": "Acquisition List",
  "/acquisition-tracker": "Acquisition Tracker",
  "/technical-integration": "Technical Integration Review",
  "/editor": "Item Editor",
  "/milestone-editor": "Milestone Editor",
  "/presentation-builder": "Presentation Builder",
};

// --- Layout chrome (consumes context) ---

function LayoutChrome({ children }: { children: ReactNode }) {
  const {
    isEditor,
    focusedItemId,
    setFocusedItemId,
    allItems,
    allMilestones,
    sortDirection,
    toggleSortDirection,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    categories,
    selectedMilestoneFilter,
    setSelectedMilestoneFilter,
    headerActions,
    openItemModal,
    isItemModalOpen,
    itemModalMode,
    editingItem,
    targetMilestoneId,
    saveItem,
    closeItemModal,
    itemModalError,
  } = useRoadmap();

  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const pageTitle = pageTitles[pathname] ?? "Company Roadmap";

  const hideControls =
    pathname === "/acquisitions" ||
    pathname === "/acquisition-tracker" ||
    pathname === "/technical-integration" ||
    pathname === "/roadmap-process" ||
    pathname === "/presentation-builder";

  return (
    <div className="flex h-full">
      <SidebarNav
        isEditor={isEditor}
        onNavigate={() => setFocusedItemId(null)}
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded((prev) => !prev)}
      />

      <div className={cn("flex-1 min-w-0 transition-all duration-300", isSidebarExpanded ? "ml-64" : "ml-16")}>
        <div className="p-4 md:p-6 lg:p-8 space-y-4">
          {/* Header */}
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isEditor && pathname === "/editor" && (
                <Button onClick={() => openItemModal("create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Roadmap Item
                </Button>
              )}
              {headerActions}
            </div>
          </div>

          {/* Controls */}
          {!hideControls && (
            <div className="flex flex-wrap gap-4 items-center justify-end">
              {pathname === "/category" && !focusedItemId && (
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger id="category-filter-layout" className="w-[180px]">
                    <SelectValue placeholder="Filter category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {pathname === "/timeline" && !focusedItemId && (
                <Select value={selectedMilestoneFilter} onValueChange={setSelectedMilestoneFilter}>
                  <SelectTrigger id="milestone-filter-layout" className="w-[180px]">
                    <SelectValue placeholder="Filter milestone..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Quarters</SelectItem>
                    {[...allMilestones]
                      .sort((a, b) => {
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
                      })
                      .map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={toggleSortDirection}>
                {sortDirection === "asc" ? (
                  <ChevronUp className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                {sortDirection === "asc" ? "Earliest first" : "Latest first"}
              </Button>
            </div>
          )}

          {/* Focus indicator */}
          {focusedItemId && (
            <div className="flex items-center justify-start">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setFocusedItemId(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Focus (Show All)
                </Button>
                <p className="text-sm text-muted-foreground">
                  (Showing items related to:{" "}
                  {allItems.find((i) => i.id === focusedItemId)?.title ?? "selected item"})
                </p>
              </div>
            </div>
          )}

          {/* Page content */}
          <div className="grid grid-cols-1">{children}</div>
        </div>
      </div>

      {/* Item modal */}
      {isItemModalOpen && (
        <Dialog open={isItemModalOpen} onOpenChange={(isOpen) => !isOpen && closeItemModal()}>
          <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {itemModalMode === "create" ? "Create New Roadmap Item" : "Edit Roadmap Item"}
              </DialogTitle>
              {itemModalMode === "create" && targetMilestoneId && (
                <DialogDescription>
                  Creating an item under milestone:{" "}
                  {allMilestones.find((m) => m.id === targetMilestoneId)?.title ?? "Selected Milestone"}
                </DialogDescription>
              )}
            </DialogHeader>
            <ItemForm
              initialData={itemModalMode === "edit" ? editingItem : undefined}
              milestoneId={itemModalMode === "create" ? targetMilestoneId : undefined}
              milestones={allMilestones}
              allItems={allItems}
              onSave={saveItem}
              onCancel={closeItemModal}
              mode={itemModalMode ?? "create"}
              error={itemModalError}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Milestone modal */}
      <MilestoneManagementModal />
    </div>
  );
}

// --- Root layout export ---

export default function RoadmapLayout({ children }: { children: ReactNode }) {
  return (
    <RoadmapProvider>
      <LayoutChrome>{children}</LayoutChrome>
    </RoadmapProvider>
  );
}
