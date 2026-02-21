"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Palette } from "lucide-react"
import type { Acquisition } from "@/types/roadmap"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const PRESET_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#f43f5e", // rose-500
  "#06b6d4", // cyan-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#a855f7", // purple-500
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  integrationOverview: z.string().optional(),
  color: z.string().optional(),
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

  const getDefaultColor = () => {
    if (initialData?.color) return initialData.color;
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      integrationOverview: initialData?.integrationOverview || "",
      color: getDefaultColor(),
    },
  })

  useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      description: initialData?.description || "",
      integrationOverview: initialData?.integrationOverview || "",
      color: initialData?.color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
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

        {/* Color Picker Field */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Display Color
              </FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === color
                            ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={field.value || "#3b82f6"}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Choose a color to identify this acquisition across the app
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

