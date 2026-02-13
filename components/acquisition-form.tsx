"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import type { Acquisition } from "@/types/roadmap"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Define validation schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  integrationOverview: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AcquisitionFormProps {
  initialData?: Acquisition | null
  onSave: (data: FormValues) => Promise<void>
  onCancel: () => void
  mode: 'create' | 'edit'
  error?: string | null
}

export default function AcquisitionForm({
  initialData,
  onSave,
  onCancel,
  mode,
  error,
}: AcquisitionFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      integrationOverview: initialData?.integrationOverview || "",
    },
  })

  useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      description: initialData?.description || "",
      integrationOverview: initialData?.integrationOverview || "",
    })
  }, [initialData, form])

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {
      await onSave(values)
    } catch (error) {
      console.error("Error saving acquisition:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 px-2">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter acquisition name" {...field} />
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
                  placeholder="Enter acquisition description" 
                  {...field} 
                  value={field.value ?? ''} 
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Brief description of the acquisition
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Integration Overview Field */}
        <FormField
          control={form.control}
          name="integrationOverview"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Integration Overview</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the integration plan and goals" 
                  {...field} 
                  value={field.value ?? ''} 
                  rows={4}
                />
              </FormControl>
              <FormDescription>
                High-level overview of how this acquisition will be integrated
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
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
            {mode === 'edit' ? "Save Changes" : "Create Acquisition"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

