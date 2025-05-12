"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRoadmap } from '@/app/(roadmapViews)/layout'; // Adjust path as needed
import MilestoneForm, { type SaveMilestoneData } from './milestone-form'; // Assuming MilestoneForm is in the same directory or path is adjusted
import type { Milestone } from '@/types/roadmap';
import { Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function MilestoneManagementModal() {
  const {
    isMilestoneModalOpen,
    closeMilestoneModal,
    saveMilestone,
    deleteMilestone, // <-- Destructure deleteMilestone (will be added to context)
    milestoneModalError,
    allMilestones,
    editingMilestone, 
    milestoneModalMode 
  } = useRoadmap();

  const [currentlyEditingMilestone, setCurrentlyEditingMilestone] = useState<Milestone | null>(null);
  const [activeTab, setActiveTab] = useState("viewEdit"); 

  const handleSwitchToEditTab = (milestone: Milestone) => {
    setCurrentlyEditingMilestone(milestone);
    setActiveTab("formTab"); // Use a single tab for both create and edit form
  };

  const handleSwitchToCreateTab = () => {
    setCurrentlyEditingMilestone(null);
    setActiveTab("formTab");
  };
  
  const handleSwitchToViewTab = () => {
    setCurrentlyEditingMilestone(null);
    setActiveTab("viewEdit");
  }

  React.useEffect(() => {
    if (milestoneModalMode === 'edit' && editingMilestone) {
      setCurrentlyEditingMilestone(editingMilestone);
      setActiveTab("formTab");
    } else if (milestoneModalMode === 'create') {
      setCurrentlyEditingMilestone(null);
      setActiveTab("formTab");
    } else {
      // Default to view tab if modal is just opened without a specific mode
      // or if mode becomes null (e.g. after successful save from external trigger)
      handleSwitchToViewTab();
    }
  }, [editingMilestone, milestoneModalMode, isMilestoneModalOpen]); // Depend on isMilestoneModalOpen to reset tab on reopen

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this milestone? This may affect associated items.")) {
      try {
        if (deleteMilestone) await deleteMilestone(id);
        // If the deleted milestone was being edited, switch back to the view tab
        if (currentlyEditingMilestone?.id === id) {
          handleSwitchToViewTab();
        }
      } catch (error) {
        console.error("Error deleting milestone:", error);
        // Error display will be handled by context via milestoneModalError in the form, 
        // or a general notification system if implemented.
      }
    }
  };
  
  if (!isMilestoneModalOpen) return null;

  return (
    <Dialog open={isMilestoneModalOpen} onOpenChange={(isOpen) => {
      if (!isOpen) {
        closeMilestoneModal(); // Context close
        handleSwitchToViewTab(); // Reset internal state
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Milestones</DialogTitle>
        </DialogHeader>
        {/* Simplified Tabs: One for list, one for form (create/edit) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
          <TabsList className="mb-4 shrink-0">
            <TabsTrigger value="viewEdit" onClick={handleSwitchToViewTab}>View/Edit</TabsTrigger>
            <TabsTrigger value="formTab" onClick={currentlyEditingMilestone ? undefined : handleSwitchToCreateTab}>
              {currentlyEditingMilestone ? "Edit Milestone" : "Add New Milestone"}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-y-auto pr-2 space-y-3"> 
            <TabsContent value="viewEdit" className="mt-0">
              {allMilestones && allMilestones.length > 0 ? (
                allMilestones
                  .slice()
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{milestone.title}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(milestone.date), "PPP")}</p>
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleSwitchToEditTab(milestone)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(milestone.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">No milestones defined yet.</p>
              )}
            </TabsContent>

            <TabsContent value="formTab" className="mt-0">
              <MilestoneForm 
                key={currentlyEditingMilestone ? `edit-${currentlyEditingMilestone.id}` : 'create'} 
                initialData={currentlyEditingMilestone} // Will be null for 'create' mode via tab switch
                onSave={async (data) => {
                  await saveMilestone(data); 
                  // After save, if successful, context should close modal or error is set
                  // If modal remains open on error, user stays on form. If success, modal closes.
                  // If modal is programmed to stay open on success, we might switch tab:
                  // if (!milestoneModalError) handleSwitchToViewTab(); 
                }}
                onCancel={() => {
                  if (currentlyEditingMilestone) {
                    handleSwitchToViewTab(); // If editing, go back to list
                  } else {
                    closeMilestoneModal(); // If creating, close the whole modal
                  }
                }}
                mode={currentlyEditingMilestone ? 'edit' : 'create'}
                error={milestoneModalError}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 