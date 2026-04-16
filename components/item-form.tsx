"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CATEGORIES, STATUSES, PIRATE_METRICS_OPTIONS, NORTH_STAR_METRICS_OPTIONS } from "@/lib/constants/roadmap"
import type { RoadmapItem, Milestone, RelevantLink } from "@/types/roadmap"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, SubmitHandler, Control } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { MultiSelectCombobox } from "@/components/multi-select-combobox"
import { RelevantLinksEditor } from "@/components/relevant-links-editor"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"

// Define validation schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.date({ required_error: "Date is required." }),
  category: z.enum(["Product", "AI", "Integrations", "Branding", "Migrations"], { required_error: "Category is required." }),
  status: z.enum(["planned", "in-progress", "completed"], { required_error: "Status is required." }),
  milestoneId: z.string().min(1, "Milestone is required"),
  productDRI: z.string().optional(),
})

// Explicit type for form values based on schema
type FormValues = z.infer<typeof formSchema>;

const statuses: string[] = [...STATUSES];
const categories: string[] = [...CATEGORIES];
const pirateMetricsOptions: string[] = [...PIRATE_METRICS_OPTIONS];
const northStarMetricsOptions: string[] = [...NORTH_STAR_METRICS_OPTIONS];

// Define the type for the data passed to onSave
type SaveItemData = Omit<z.infer<typeof formSchema>, 'date'> & {
    date: string; // Date formatted as string
    pirateMetrics: string[];
    northStarMetrics: string[];
    relatedItemIds: string[];
    relevantLinks: RelevantLink[];
    productDRI?: string;
};

interface ItemFormProps {
  initialData?: RoadmapItem | null;       // Changed from 'item'
  milestones: Milestone[];
  allItems: RoadmapItem[]; 
  onSave: (data: SaveItemData) => Promise<void>; // Keep signature, context saveItem will adapt
  onCancel: () => void;
  milestoneId?: string | null;          // Changed from 'initialMilestoneId', for new item target
  mode: 'create' | 'edit';               // Added mode
  error?: string | null;                  // Added error prop
}

export default function ItemForm({
  initialData,
  milestones,
  allItems,
  onSave,
  onCancel,
  milestoneId, // This is the targetMilestoneId for new items
  mode,
  error,
}: ItemFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPirateMetrics, setSelectedPirateMetrics] = useState<string[]>([])
  const [selectedNorthStarMetrics, setSelectedNorthStarMetrics] = useState<string[]>([])
  const [selectedRelatedItemIds, setSelectedRelatedItemIds] = useState<string[]>([])
  const [relevantLinks, setRelevantLinks] = useState<RelevantLink[]>([]);

  // Check if incoming item category/status is valid, otherwise use undefined/default
  const initialCategory = categories.includes(initialData?.category || '') ? initialData?.category as FormValues['category'] : undefined;
  const initialStatus = statuses.includes(initialData?.status || '') ? initialData?.status as FormValues['status'] : "planned";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      date: initialData?.date ? new Date(initialData.date) : undefined,
      category: initialCategory,
      status: initialStatus,
      milestoneId: initialData?.milestoneId || milestoneId || undefined,
      productDRI: initialData?.productDRI || "",
    },
  })

  // Effect to update form and multi-select states when item prop changes
  useEffect(() => {
    const isNewItem = !initialData;
    const defaultCategory = categories.includes(initialData?.category || '') ? initialData?.category as FormValues['category'] : undefined;
    const defaultStatus = statuses.includes(initialData?.status || '') ? initialData?.status as FormValues['status'] : "planned";

    form.reset({
        title: initialData?.title || "",
        description: initialData?.description || "",
        date: initialData?.date ? new Date(initialData.date) : (isNewItem ? new Date() : undefined),
        category: defaultCategory,
        status: defaultStatus,
        milestoneId: initialData?.milestoneId || milestoneId || undefined,
        productDRI: initialData?.productDRI || "",
      });
      
      setSelectedPirateMetrics(initialData?.pirateMetrics || []);
      setSelectedNorthStarMetrics(initialData?.northStarMetrics || []);
      
      setRelevantLinks((initialData?.relevantLinks as RelevantLink[]) || []);
      
      // --- Initialize related items state --- 
      // Prefer item.relatedItemIds if available (e.g., from previous form state)
      // Otherwise, derive from item.relatedItems (fetched data)
      const initialRelatedIds = initialData?.relatedItemIds 
          ? initialData.relatedItemIds 
          : (initialData?.relatedItems || []).map(related => related.id);
      setSelectedRelatedItemIds(initialRelatedIds || []); 
      
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form.reset, milestoneId]);

  // Suggest Milestone based on Date
  const suggestMilestone = useCallback((selectedDate: Date | undefined): string => {
    if (!selectedDate || milestones.length === 0) return form.getValues("milestoneId") || "";

    const sortedMilestonesForSuggest = [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const selectedTime = selectedDate.getTime();

    // Find the first milestone on or after the selected date
    for (const milestone of sortedMilestonesForSuggest) {
        if (new Date(milestone.date).getTime() >= selectedTime) {
            return milestone.id;
        }
    }
    // If no future milestone, return the last one
    return sortedMilestonesForSuggest[sortedMilestonesForSuggest.length - 1].id;

  }, [milestones, form]); // Depend on form instance

  // Handler for Date Change
  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    form.setValue("date", date, { shouldValidate: true }); // Update form state
    const suggestedMilestoneId = suggestMilestone(date);
    if (suggestedMilestoneId && suggestedMilestoneId !== form.getValues("milestoneId")) {
        form.setValue("milestoneId", suggestedMilestoneId, { shouldValidate: true });
    }
  }

  // Toggle Handlers for multi-selects
  const handlePirateMetricToggle = useCallback((metric: string) => {
    setSelectedPirateMetrics(prev => 
        prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  }, []);

  const handleNorthStarMetricToggle = useCallback((metric: string) => {
    setSelectedNorthStarMetrics(prev => 
        prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  }, []);

  const handleRelatedItemToggle = useCallback((itemId: string) => {
    setSelectedRelatedItemIds(prev => 
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  }, []);

  // Submit Handler - Let type be inferred from handleSubmit
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const saveData: SaveItemData = {
        ...values, 
        date: format(values.date, "yyyy-MM-dd"), 
        pirateMetrics: selectedPirateMetrics,
        northStarMetrics: selectedNorthStarMetrics,
        relatedItemIds: selectedRelatedItemIds,
        relevantLinks: relevantLinks.filter(link => link.url.trim() !== ''),
        productDRI: values.productDRI,
      };
      await onSave(saveData);
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out the current item being edited from the list of related items
  const availableItemsForLinking = allItems.filter(i => i.id !== initialData?.id);

  // ItemForm now returns the Form directly, to be embedded in the layout's Dialog
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
                    <Input placeholder="Enter item title" {...field} />
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
                    {/* Ensure value is never null/undefined for Textarea */}
                    <Textarea placeholder="Enter item description" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            {/* Date Field */}
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
                                {field.value ? (
                                format(field.value, "PPP")
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => handleDateChange(date)}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            {/* Category & Status Fields (Side-by-side) */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "planned"}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {statuses.map(stat => (
                                <SelectItem key={stat} value={stat} className="capitalize">{stat.replace('-', ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            </div>
            {/* Milestone Field */}
            <FormField
                control={form.control}
                name="milestoneId"
                render={({ field }) => (
                <FormItem>
                <FormLabel>Milestone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""} >
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {milestones.length === 0 && <SelectItem value="none" disabled>No milestones available</SelectItem>}
                        {milestones.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.title} ({format(new Date(m.date), "MMM d, yyyy")})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
            {/* Product DRI Field */}
            <FormField
                control={form.control}
                name="productDRI"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Product DRI</FormLabel>
                    <FormControl>
                    <Input 
                        placeholder="Enter Product DRI name" 
                        {...field} 
                        value={field.value ?? ''} 
                    />
                    </FormControl>
                    <FormDescription>
                        Directly Responsible Individual for this product item
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            {/* --- Multi-select fields --- */}
            <MultiSelectCombobox
              label="Pirate Metrics"
              options={pirateMetricsOptions.map((m) => ({ value: m, label: m }))}
              selected={selectedPirateMetrics}
              onToggle={handlePirateMetricToggle}
              placeholder="Select metrics..."
              searchPlaceholder="Search metrics..."
              emptyMessage="No metric found."
            />
            <MultiSelectCombobox
              label="North Star Metrics"
              options={northStarMetricsOptions.map((m) => ({ value: m, label: m }))}
              selected={selectedNorthStarMetrics}
              onToggle={handleNorthStarMetricToggle}
              placeholder="Select metrics..."
              searchPlaceholder="Search metrics..."
              emptyMessage="No metric found."
            />
            <MultiSelectCombobox
              label="Related Items"
              options={availableItemsForLinking.map((itm) => ({
                value: itm.id,
                label: itm.title,
                searchValue: itm.title,
                sublabel: itm.category,
              }))}
              selected={selectedRelatedItemIds}
              onToggle={handleRelatedItemToggle}
              placeholder="Link related items..."
              searchPlaceholder="Search items..."
              emptyMessage="No items found."
              description="Link this item to other existing roadmap items."
            />

            {/* --- Relevant Links --- */}
            <RelevantLinksEditor
              links={relevantLinks}
              onChange={setRelevantLinks}
              description="Add external links for reference."
            />

            {/* Display error prop */}
            {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            
            {/* Submit and Cancel Buttons - these are now the form's own footer essentially */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'edit' ? "Save Changes" : "Add Item"} 
                </Button>
            </div>
        </form>
    </Form>
  )
} 