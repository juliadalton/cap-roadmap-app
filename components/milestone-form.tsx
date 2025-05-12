"use client"

import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import type { Milestone } from "@/types/roadmap"

// Validation Schema
const milestoneFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date({ required_error: "Date is required." }),
})

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>

// Data type for onSave prop
export type SaveMilestoneData = Omit<MilestoneFormValues, 'date'> & {
  date: string // Date formatted as yyyy-MM-dd
}

interface MilestoneFormProps {
  initialData?: Milestone | null
  onSave: (data: SaveMilestoneData) => Promise<void>
  onCancel: () => void
  mode: 'create' | 'edit'
  error?: string | null
}

export default function MilestoneForm({
  initialData,
  onSave,
  onCancel,
  mode,
  error,
}: MilestoneFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      date: initialData?.date ? new Date(initialData.date) : undefined,
    },
  })

  useEffect(() => {
    form.reset({
      title: initialData?.title || "",
      date: initialData?.date ? new Date(initialData.date) : (mode === 'create' ? new Date() : undefined),
    })
  }, [initialData, mode, form.reset])

  const onSubmit = async (values: MilestoneFormValues) => {
    setIsLoading(true)
    try {
      const saveData: SaveMilestoneData = {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
      }
      await onSave(saveData)
    } catch (err) {
      // Error is expected to be handled by the parent context and displayed via 'error' prop
      console.error("MilestoneForm: Error during save:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter milestone title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'edit' ? "Save Changes" : "Create Milestone"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
