'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Milestone } from '@/types/roadmap';
import MilestoneForm from '@/components/milestone-form';

export default function MilestoneEditorPage() {
  const { data: session } = useSession();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Delete confirmation states
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Check if user is an editor
  const isEditor = session?.user?.role === 'editor';

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/milestones-clean/list');
      if (!response.ok) {
        throw new Error(`Failed to fetch milestones: ${response.statusText}`);
      }
      const data: Milestone[] = await response.json();
      setMilestones(data);
    } catch (err: any) {
      console.error('Error fetching milestones:', err);
      setError(err.message || 'Failed to fetch milestones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load milestones only after authentication is confirmed
  useEffect(() => {
    if (session?.user) {
      fetchMilestones();
    }
  }, [fetchMilestones, session?.user]);

  // Listen for create milestone events from layout button
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleCreateMilestone = () => {
      openCreateModal();
    };

    window.addEventListener('createMilestone', handleCreateMilestone);
    return () => window.removeEventListener('createMilestone', handleCreateMilestone);
  }, []);

  // Handle create milestone
  const handleCreateMilestone = async (milestoneData: { title: string; date: string }) => {
    setModalError(null);
    try {
      const response = await fetch('/api/milestones-clean/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create milestone');
      }

      const newMilestone: Milestone = await response.json();
      setMilestones(prev => [...prev, newMilestone]);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Error creating milestone:', err);
      setModalError(err.message || 'Failed to create milestone');
    }
  };

  // Handle edit milestone
  const handleEditMilestone = async (milestoneData: { title: string; date: string }) => {
    if (!editingMilestone) return;
    
    setModalError(null);
    try {
      const response = await fetch(`/api/milestones-clean/edit/${editingMilestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update milestone');
      }

      const updatedMilestone: Milestone = await response.json();
      setMilestones(prev => prev.map(m => m.id === editingMilestone.id ? updatedMilestone : m));
      setIsEditModalOpen(false);
      setEditingMilestone(null);
    } catch (err: any) {
      console.error('Error updating milestone:', err);
      setModalError(err.message || 'Failed to update milestone');
    }
  };

  // Handle delete milestone
  const handleDeleteMilestone = async () => {
    if (!milestoneToDelete) return;

    try {
      const response = await fetch(`/api/milestones-clean/delete/${milestoneToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete milestone');
      }

      setMilestones(prev => prev.filter(m => m.id !== milestoneToDelete.id));
      setIsDeleteDialogOpen(false);
      setMilestoneToDelete(null);
    } catch (err: any) {
      console.error('Error deleting milestone:', err);
      setError(err.message || 'Failed to delete milestone');
    }
  };

  // Handle opening edit modal
  const openEditModal = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Handle opening create modal
  const openCreateModal = () => {
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  // Handle opening delete dialog
  const openDeleteDialog = (milestone: Milestone) => {
    setMilestoneToDelete(milestone);
    setIsDeleteDialogOpen(true);
  };

  // Show loading state (including auth loading)
  if (isLoading || !session) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading milestones...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-red-600">
            <p className="text-lg font-semibold mb-2">Error loading milestones</p>
            <p className="mb-4">{error}</p>
            <Button onClick={fetchMilestones} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isEditor) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Access Denied</p>
            <p>You need editor permissions to manage milestones.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No milestones found. Create your first milestone above.
                </TableCell>
              </TableRow>
            ) : (
              milestones.map((milestone) => (
                <TableRow key={milestone.id}>
                  <TableCell className="font-medium">{milestone.title}</TableCell>
                  <TableCell>{new Date(milestone.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => openEditModal(milestone)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openDeleteDialog(milestone)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Milestone Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
          </DialogHeader>
          <MilestoneForm
            onSave={handleCreateMilestone}
            onCancel={() => setIsCreateModalOpen(false)}
            mode="create"
            error={modalError}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Milestone Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
          </DialogHeader>
          <MilestoneForm
            initialData={editingMilestone}
            onSave={handleEditMilestone}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingMilestone(null);
            }}
            mode="edit"
            error={modalError}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the milestone "{milestoneToDelete?.title}"? 
              This action cannot be undone and may affect associated roadmap items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setMilestoneToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMilestone}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
