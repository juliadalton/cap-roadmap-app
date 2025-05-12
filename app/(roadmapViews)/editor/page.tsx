"use client";

import React from 'react';
import { useRoadmap } from "../layout"; // Use the context hook
import { EditorViewTable } from "@/components/editor-view-table";
import { Lock } from "lucide-react";
import type { RoadmapItem } from "@/types/roadmap";

export default function EditorPage() {
  // Consume context from the layout
  const {
    allItems, // Pass ALL items to the editor table, not filtered displayedItems
    allMilestones,
    sortDirection, 
    isEditor, 
    openItemModal, // <-- Destructure from context
    deleteItem,    // <-- Destructure from context
  } = useRoadmap();

  // Handler to open the modal for editing an item
  const handleEditItemModal = (item: RoadmapItem) => {
    openItemModal('edit', item);
  };

  // Handler to delete an item using context function
  const handleDeleteItemClick = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteItem(id);
        // Optionally show success notification
      } catch (error) {
        console.error("EditorPage: Failed to delete item:", error);
        // Optionally show error notification to user
        alert(`Error deleting item: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Render restricted message if not an editor
  if (!isEditor) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <div className="text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">Editor View Restricted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You need editor permissions to access this view.
          </p>
        </div>
      </div>
    );
  }

  // Render the table for editors
  return (
    <div className="space-y-4">
      <EditorViewTable
        items={allItems} 
        milestones={allMilestones}
        onEditItem={handleEditItemModal}  
        onDeleteItem={handleDeleteItemClick} 
        isEditor={isEditor}
        sortDirection={sortDirection}
      />
    </div>
  );
} 