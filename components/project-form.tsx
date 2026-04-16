"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { MultiSelectCombobox } from "@/components/multi-select-combobox"
import { RelevantLinksEditor } from "@/components/relevant-links-editor"
import type { Project, Acquisition, Milestone, RelevantLink } from "@/types/roadmap"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Define validation schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startMilestoneId: z.string().optional(),
  endMilestoneId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// Data to be saved
export type SaveProjectData = FormValues & {
  acquisitionIds: string[]
  relevantLinks: RelevantLink[]
}

interface ProjectFormProps {
  initialData?: Project | null
  acquisitions: Acquisition[]
  milestones: Milestone[]
  onSave: (data: SaveProjectData) => Promise<void>
  onCancel: () => void
  mode: 'create' | 'edit'
  error?: string | null
  preselectedAcquisitionId?: string | null
}

export default function ProjectForm({
  initialData,
  acquisitions,
  milestones,
  onSave,
  onCancel,
  mode,
  error,
  preselectedAcquisitionId,
}: ProjectFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAcquisitionIds, setSelectedAcquisitionIds] = useState<string[]>([])
  const [relevantLinks, setRelevantLinks] = useState<RelevantLink[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      startMilestoneId: initialData?.startMilestoneId || "none",
      endMilestoneId: initialData?.endMilestoneId || "none",
    },
  })

  useEffect(() => {
    form.reset({
      title: initialData?.title || "",
      description: initialData?.description || "",
      startMilestoneId: initialData?.startMilestoneId || "none",
      endMilestoneId: initialData?.endMilestoneId || "none",
    })

    // Handle acquisition IDs
    if (initialData?.acquisitions) {
      setSelectedAcquisitionIds(initialData.acquisitions.map(a => a.id))
    } else if (preselectedAcquisitionId) {
      setSelectedAcquisitionIds([preselectedAcquisitionId])
    } else {
      setSelectedAcquisitionIds([])
    }

    // Handle relevant links migration
    const initialLinks = initialData?.relevantLinks || []
    const formattedLinks: RelevantLink[] = initialLinks.map(link => {
      if (typeof link === 'object' && link !== null && 'url' in link) {
        return link as RelevantLink
      }
      return { url: link as string }
    })
    setRelevantLinks(formattedLinks)
  }, [initialData, form, preselectedAcquisitionId])

  const handleAcquisitionToggle = useCallback((acquisitionId: string) => {
    setSelectedAcquisitionIds(prev => 
      prev.includes(acquisitionId) 
        ? prev.filter(id => id !== acquisitionId) 
        : [...prev, acquisitionId]
    )
  }, [])

  const onSubmit = async (values: FormValues) => {
    if (selectedAcquisitionIds.length === 0) {
      form.setError("root", { message: "Please select at least one acquisition" })
      return
    }

    setIsLoading(true)
    try {
      const saveData: SaveProjectData = {
        ...values,
        // Convert "none" back to undefined for API
        startMilestoneId: values.startMilestoneId === "none" ? undefined : values.startMilestoneId,
        endMilestoneId: values.endMilestoneId === "none" ? undefined : values.endMilestoneId,
        acquisitionIds: selectedAcquisitionIds,
        relevantLinks: relevantLinks.filter(link => link.url.trim() !== ''),
      }
      await onSave(saveData)
    } catch (error) {
      console.error("Error saving project:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sort milestones by date
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Sort acquisitions alphabetically
  const sortedAcquisitions = [...acquisitions].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 px-2">
        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter project title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter project description. Markdown supported: **bold**, - bullet lists, paragraph breaks, etc." 
                  {...field} 
                  value={field.value ?? ''} 
                  rows={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Acquisition Multi-Select */}
        <MultiSelectCombobox
          label="Acquisitions"
          options={sortedAcquisitions.map((a) => ({ value: a.id, label: a.name }))}
          selected={selectedAcquisitionIds}
          onToggle={handleAcquisitionToggle}
          placeholder="Select acquisitions..."
          searchPlaceholder="Search acquisitions..."
          emptyMessage="No acquisitions found."
          description="Associate this project with one or more acquisitions"
          allowIndividualRemove
        />
        {selectedAcquisitionIds.length === 0 && form.formState.isSubmitted && (
          <p className="text-sm font-medium text-destructive">Please select at least one acquisition</p>
        )}

        {/* Milestone Selection (Start and End) */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startMilestoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Milestone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start milestone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No start milestone</SelectItem>
                    {sortedMilestones.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title} ({format(new Date(m.date), "MMM d, yyyy")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endMilestoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Milestone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end milestone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No end milestone</SelectItem>
                    {sortedMilestones.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title} ({format(new Date(m.date), "MMM d, yyyy")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Relevant Links */}
        <RelevantLinksEditor
          links={relevantLinks}
          onChange={setRelevantLinks}
          description="Add external links for reference."
        />

        {/* Display error prop */}
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
        
        {/* Submit and Cancel Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'edit' ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

