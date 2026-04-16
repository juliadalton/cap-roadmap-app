"use client";

import React, { useState } from 'react';
import { useRoadmap } from "@/context/roadmap-context";
import { EditorViewTable } from "@/components/editor-view-table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Lock } from "lucide-react";
import type { RoadmapItem } from "@/types/roadmap";

export default function EditorPage() {
  const {
    allItems,
    allMilestones,
    sortDirection,
    isEditor,
    openItemModal,
    deleteItem,
  } = useRoadmap();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleEditItemModal = (item: RoadmapItem) => {
    openItemModal('edit', item);
  };

  const handleDeleteItemClick = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteItem(pendingDeleteId);
    } catch (error) {
      console.error("EditorPage: Failed to delete item:", error);
    } finally {
      setPendingDeleteId(null);
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

  return (
    <>
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
