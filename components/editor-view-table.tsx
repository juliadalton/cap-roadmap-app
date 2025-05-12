"use client"

import { useState, useCallback } from "react"
import { Edit, Trash2, Lock, Check, X, ChevronsUpDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { RoadmapItem, Milestone } from "@/types/roadmap"
import { getStatusColor, getCategoryColor, formatDate } from "@/lib/utils/formatters"

// Define options centrally (could also be passed as props)
const statuses = ["planned", "in-progress", "completed"]
const categories = ["Product", "AI", "Integrations", "Branding", "Migrations"]
const pirateMetricsOptions = ["Acquisition", "Activation", "Revenue", "Retention", "Referral"]
const northStarMetricsOptions = ["Increase Automated Deflections", "Reduce Average Handle Time", "Increase Automated Processes", "Increase in Conversions"]

interface EditorViewTableProps {
  items: RoadmapItem[]
  milestones: Milestone[]
  onEditItem: (item: RoadmapItem) => void
  onDeleteItem: (id: string) => void
  onAddItem?: (milestoneId?: string) => void
  isEditor: boolean
  sortDirection: "asc" | "desc"
}

export function EditorViewTable({
  items,
  milestones,
  onEditItem,
  onDeleteItem,
  onAddItem,
  isEditor,
  sortDirection,
}: EditorViewTableProps) {
  // Only show this view for editors
  if (!isEditor) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <div className="text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">Editor View Restricted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You need editor permissions to access this view
          </p>
        </div>
      </div>
    )
  }

  // All items sorted by milestone and category
  const sortedItems = [...items].sort((a, b) => {
    // First sort by milestone date
    const milestoneA = milestones.find((m) => m.id === a.milestoneId)
    const milestoneB = milestones.find((m) => m.id === b.milestoneId)

    if (!milestoneA || !milestoneB) return 0

    const dateA = new Date(milestoneA.date).getTime()
    const dateB = new Date(milestoneB.date).getTime()
    
    if (dateA !== dateB) {
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA
    }
    
    // Then sort by category
    return a.category.localeCompare(b.category)
  })

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr,100px,100px,1fr,1fr,2fr,minmax(80px,auto)] gap-2 p-3 font-medium bg-[rgb(240_244_249)] dark:bg-muted/50 text-xs sticky top-0 z-10">
        <div>Milestone</div>
        <div>Category</div>
        <div>Status</div>
        <div>Pirate Metric</div>
        <div>North Star Metric</div>
        <div>Title</div>
        <div className="text-right pr-2">Actions</div>
      </div>
      <div className="divide-y">
        {sortedItems.map((item) => {
          const milestone = milestones.find((m) => m.id === item.milestoneId)

          return (
            <div key={item.id} className={`grid grid-cols-[1fr,100px,100px,1fr,1fr,2fr,minmax(80px,auto)] gap-2 p-3 items-center hover:bg-muted/30`}>
              {/* Milestone */}
              <div className="text-sm">
                {milestone?.title || "Unknown"} 
                <span className="block text-xs text-muted-foreground">
                  {milestone ? formatDate(milestone.date) : "N/A"}
                </span>
              </div>

              {/* Category */}
              <div>
                <Badge className={cn("px-2 py-0.5 text-xs", getCategoryColor(item.category))}>
                  {item.category}
                </Badge>
              </div>

              {/* Status */}
              <div>
                <div className="flex items-center">
                  <div className={cn("h-2 w-2 rounded-full mr-2", getStatusColor(item.status))} />
                  <span className="text-xs capitalize">{item.status.replace('-', ' ')}</span>
                </div>
              </div>

              {/* Pirate Metrics */}
              <div className="text-xs space-y-0.5">
                {(item.pirateMetrics && item.pirateMetrics.length > 0) 
                    ? item.pirateMetrics.map(m => <div key={m}>{m}</div>) 
                    : <span className="text-muted-foreground">-</span>}
              </div>

              {/* North Star Metrics */}
              <div className="text-xs space-y-0.5">
                {(item.northStarMetrics && item.northStarMetrics.length > 0) 
                    ? item.northStarMetrics.map(m => <div key={m}>{m}</div>) 
                    : <span className="text-muted-foreground">-</span>}
              </div>

              {/* Title */}
              <div className="text-sm font-medium break-words pr-2">{item.title}</div>

              {/* Actions */}
              <div className="text-right space-x-1 pr-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditItem(item)} title="Edit Item">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/90" onClick={() => onDeleteItem(item.id)} title="Delete Item">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 