"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MilestoneForm from "@/components/milestone-form"
import type { Milestone, RoadmapItem } from "@/types/roadmap"

interface MilestoneManagementProps {
  initialMilestones: Milestone[];
  roadmapItems: RoadmapItem[];
  onClose: () => void;
  onDataChange: () => void;
}

export default function MilestoneManagement({
  initialMilestones,
  roadmapItems,
  onClose,
  onDataChange,
}: MilestoneManagementProps) {
  const [activeTab, setActiveTab] = useState("list")
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null)
  const [internalMilestones, setInternalMilestones] = useState<Milestone[]>([...initialMilestones])
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setInternalMilestones([...initialMilestones])
  }, [initialMilestones])

  const sortedMilestones = [...internalMilestones].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  const handleEdit = (milestone: Milestone) => {
    setApiError(null)
    setEditingMilestone(milestone)
    setActiveTab("edit")
  }

  const handleDelete = (id: string) => {
    setApiError(null)
    setDeletingMilestoneId(id)
  }

  const confirmDelete = async () => {
    if (!deletingMilestoneId) return
    setApiError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/roadmap/milestones/${deletingMilestoneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to delete milestone: ${response.statusText}`)
      }

      setInternalMilestones((prev) => prev.filter((m) => m.id !== deletingMilestoneId))
      setDeletingMilestoneId(null)
      onDataChange()

    } catch (error: any) {
      console.error("Error deleting milestone:", error)
      setApiError(error.message || 'Failed to delete milestone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async (milestoneData: Omit<Milestone, 'id'> | Milestone) => {
    setApiError(null)
    setIsSubmitting(true)

    const isEditing = 'id' in milestoneData
    const url = isEditing ? `/api/roadmap/milestones/${milestoneData.id}` : '/api/roadmap/milestones'
    const method = isEditing ? 'PATCH' : 'POST'

    const payload = isEditing ? { title: milestoneData.title, date: milestoneData.date } : milestoneData

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to save milestone: ${response.statusText}`)
      }

      const savedMilestone: Milestone = await response.json()

      if (isEditing) {
        setInternalMilestones((prev) =>
          prev.map((m) => (m.id === savedMilestone.id ? savedMilestone : m))
        )
      } else {
        setInternalMilestones((prev) => [...prev, savedMilestone])
      }

      setActiveTab("list")
      setEditingMilestone(null)
      onDataChange()

    } catch (error: any) {
      console.error("Error saving milestone:", error)
      setApiError(error.message || 'Failed to save milestone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setApiError(null)
    setActiveTab("list")
    setEditingMilestone(null)
  }

  const getMilestoneItemCount = (milestoneId: string) => {
    return roadmapItems.filter((item) => item.milestoneId === milestoneId).length
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Milestone Management</DialogTitle>
          <DialogDescription>Add, edit, or remove milestones in your roadmap timeline.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Milestone List</TabsTrigger>
            <TabsTrigger 
              value="edit" 
              onClick={() => setEditingMilestone(null)}
            >
              {editingMilestone ? "Edit Milestone" : "Add Milestone"}
            </TabsTrigger>
          </TabsList>

          {apiError && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {apiError}
            </div>
          )}

          <TabsContent value="list" className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="border rounded-md dark:border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMilestones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No milestones found. Add your first milestone.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedMilestones.map((milestone) => {
                      const itemCount = getMilestoneItemCount(milestone.id)

                      return (
                        <TableRow key={milestone.id}>
                          <TableCell className="font-medium">{milestone.title}</TableCell>
                          <TableCell>{formatDate(milestone.date)}</TableCell>
                          <TableCell>
                            <Badge variant={itemCount > 0 ? "default" : "outline"}>
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(milestone)} disabled={isSubmitting}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(milestone.id)}
                                disabled={itemCount > 0 || isSubmitting}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {sortedMilestones.length > 0 && (
              <div className="flex items-center mt-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mr-2" />
                Milestones with associated items cannot be deleted.
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-4">
            <MilestoneForm
              milestone={editingMilestone}
              existingMilestones={internalMilestones}
              onSave={handleSave}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={!!deletingMilestoneId} onOpenChange={() => setDeletingMilestoneId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this milestone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {apiError && (
            <p className="text-sm text-destructive">Error: {apiError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
