"use client";

import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    useMemo, 
    useCallback,
    ReactNode 
} from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ChevronDown, ChevronUp, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoadmapItem, Milestone } from "@/types/roadmap";
import { useAuth } from "@/context/auth-context"; // Assuming auth context is needed for editor status
import { cn } from "@/lib/utils"; // Import cn for conditional styling
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Dialog components
import ItemForm from "@/components/item-form"; // Corrected: Import ItemForm as default
import { MilestoneManagementModal } from "@/components/milestone-management-modal"; // <-- Import the new modal
import { type SaveMilestoneData } from "@/components/milestone-form"; // <-- Re-add this type import

// --- Context Definition ---

interface RoadmapContextProps {
  // Data
  allItems: RoadmapItem[];
  allMilestones: Milestone[];
  isLoadingData: boolean;
  apiError: string | null;
  fetchData: () => Promise<void>; // Expose refetch if needed

  // Shared State & Setters
  sortDirection: "asc" | "desc";
  toggleSortDirection: () => void;
  showHistorical: boolean;
  toggleHistorical: () => void;
  focusedItemId: string | null;
  setFocusedItemId: React.Dispatch<React.SetStateAction<string | null>>;

  // Derived Data (based on focus, history, sort)
  displayedItems: RoadmapItem[];
  displayedMilestones: Milestone[];
  
  // Other relevant info
  isEditor: boolean;
  historicalMilestoneCount: number;
  
  // Add category filter state
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  categories: string[]; // <-- Add categories to context props

  // Modal State & Handlers for ItemForm
  isItemModalOpen: boolean;
  itemModalMode: 'create' | 'edit' | null;
  editingItem: RoadmapItem | null; // For editing existing item
  targetMilestoneId: string | null; // For creating item under specific milestone
  openItemModal: (mode: 'create' | 'edit', data?: RoadmapItem | string) => void;
  closeItemModal: () => void;
  saveItem: (itemData: Partial<RoadmapItem> & { relatedItemIds?: string[] }) => Promise<void>; // For saving item (create/update)
  deleteItem: (itemId: string) => Promise<void>; // For deleting item
  itemModalError: string | null; // For displaying errors in the modal

  // Milestone Modal State & Handlers
  isMilestoneModalOpen: boolean;
  milestoneModalMode: 'create' | 'edit' | null;
  editingMilestone: Milestone | null;
  openMilestoneModal: (mode: 'create' | 'edit', data?: Milestone) => void;
  closeMilestoneModal: () => void;
  saveMilestone: (milestoneData: SaveMilestoneData) => Promise<void>;
  milestoneModalError: string | null;
  deleteMilestone: (milestoneId: string) => Promise<void>; // <-- Add deleteMilestone
}

const RoadmapContext = createContext<RoadmapContextProps | undefined>(undefined);

export const useRoadmap = (): RoadmapContextProps => {
  const context = useContext(RoadmapContext);
  if (!context) {
    throw new Error("useRoadmap must be used within a RoadmapProvider");
  }
  return context;
};

// --- Provider Component ---

interface RoadmapLayoutProps {
  children: ReactNode;
}

// Move categories definition here for use in filter and context
const categories = ["Product", "AI", "Integrations", "Branding", "Migrations"];

export default function RoadmapLayout({ children }: RoadmapLayoutProps) {
  const { user, userRole, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // Get auth status and loading state
  const isEditor = userRole === "editor";
  const pathname = usePathname();
  const router = useRouter(); // <-- Initialize router

  // Data States
  const [allItems, setAllItems] = useState<RoadmapItem[]>([]);
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [isLoadingRoadmapData, setIsLoadingRoadmapData] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Shared UI States
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showHistorical, setShowHistorical] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

  // New state for ItemForm modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [targetMilestoneId, setTargetMilestoneId] = useState<string | null>(null);
  const [itemModalError, setItemModalError] = useState<string | null>(null); // New state for modal errors

  // New state for MilestoneForm modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneModalMode, setMilestoneModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneModalError, setMilestoneModalError] = useState<string | null>(null);

  // Data Fetching Logic (moved from page.tsx)
  const fetchData = useCallback(async () => {
    setIsLoadingRoadmapData(true);
    setApiError(null);
    try {
      // Make sequential calls instead of concurrent to avoid auth conflicts
      const milestonesResponse = await fetch('/api/roadmap/milestones');
      if (!milestonesResponse.ok) {
        throw new Error(`Failed to fetch milestones: ${milestonesResponse.statusText}`);
      }
      const milestonesData: Milestone[] = await milestonesResponse.json();

      const itemsResponse = await fetch('/api/roadmap/items');
      if (!itemsResponse.ok) {
        throw new Error(`Failed to fetch roadmap items: ${itemsResponse.statusText}`);
      }
      const itemsData: RoadmapItem[] = await itemsResponse.json();

      setAllMilestones(milestonesData);
      setAllItems(itemsData);

    } catch (error: any) {
      console.error("Layout: Error fetching data:", error);
      setApiError(error.message || 'An unknown error occurred while fetching data.');
    } finally {
      setIsLoadingRoadmapData(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        fetchData();
    }
  }, [fetchData, isAuthenticated]);

  // Authentication Check
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // State Toggles
  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const toggleHistorical = useCallback(() => {
    setShowHistorical(prev => !prev);
  }, []);

  // Placeholder functions for modal - will be fleshed out
  const openItemModal = useCallback((mode: 'create' | 'edit', data?: RoadmapItem | string) => {
    setIsItemModalOpen(true);
    setItemModalMode(mode);
    setItemModalError(null); // Clear previous errors when opening modal
    if (mode === 'edit' && typeof data === 'object' && data !== null && 'id' in data) {
      setEditingItem(data as RoadmapItem);
      setTargetMilestoneId(null);
    } else if (mode === 'create' && typeof data === 'string') {
      setTargetMilestoneId(data);
      setEditingItem(null);
    } else {
      // Clear if data is invalid for the mode
      setEditingItem(null);
      setTargetMilestoneId(null);
    }
  }, []);

  const closeItemModal = useCallback(() => {
    setIsItemModalOpen(false);
    setItemModalMode(null);
    setEditingItem(null);
    setTargetMilestoneId(null);
    setItemModalError(null); // Clear errors on close
  }, []);

  // TODO: Implement actual API calls for saveItem and deleteItem
  const saveItem = useCallback(async (itemData: Partial<RoadmapItem> & { relatedItemIds?: string[] }) => {
    setItemModalError(null); // Clear previous errors
    const isEditMode = itemModalMode === 'edit' && editingItem;
    const url = isEditMode ? `/api/roadmap/items/${editingItem.id}` : '/api/roadmap/items';
    const method = isEditMode ? 'PATCH' : 'POST';

    // Ensure milestoneId is present for new items, or use existing for edits
    let payload: any = { ...itemData };
    if (itemModalMode === 'create' && targetMilestoneId) {
        payload.milestoneId = targetMilestoneId;
    } else if (isEditMode) {
        payload.milestoneId = itemData.milestoneId || editingItem.milestoneId; // Ensure milestoneId is included on PATCH
    }
    // If milestoneId is still somehow missing for a new item and not an edit, it's an issue
    if (itemModalMode === 'create' && !payload.milestoneId) {
        setItemModalError("Milestone ID is missing for new item.");
        console.error("Context: Milestone ID is missing for new item.");
        return;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
        throw new Error(errorData.message || `Failed to ${method === 'POST' ? 'create' : 'update'} item`);
      }

      await fetchData(); // Refetch all data
      closeItemModal(); // Close modal on success

    } catch (error: any) {
      console.error(`Context: Error ${method === 'POST' ? 'creating' : 'updating'} item:`, error);
      setItemModalError(error.message || 'An unexpected error occurred.');
      // Do not close modal on error, so user can see the message
    }
  }, [itemModalMode, editingItem, targetMilestoneId, fetchData, closeItemModal]);

  const deleteItem = useCallback(async (itemId: string) => {
    // Note: We don't use itemModalError here as delete is not directly tied to the modal
    // Errors from delete should be handled by the calling component (e.g., showing a toast)
    try {
      const response = await fetch(`/api/roadmap/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
        throw new Error(errorData.message || 'Failed to delete item');
      }

      await fetchData(); // Refetch all data on successful deletion

    } catch (error: any) {
      console.error("Context: Error deleting item:", error);
      // Re-throw the error so the calling component (e.g., TimelinePage) can catch it
      // and potentially display a notification.
      throw error; 
    }
  }, [fetchData]);

  // --- Milestone Modal Handlers ---
  const openMilestoneModal = useCallback((mode: 'create' | 'edit', data?: Milestone) => {
    setIsMilestoneModalOpen(true);
    setMilestoneModalMode(mode);
    setMilestoneModalError(null);
    if (mode === 'edit' && data) {
      setEditingMilestone(data);
    } else {
      setEditingMilestone(null);
    }
  }, []);

  const closeMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(false);
    setMilestoneModalMode(null);
    setEditingMilestone(null);
    setMilestoneModalError(null);
  }, []);

  const saveMilestone = useCallback(async (milestoneData: SaveMilestoneData) => {
    setMilestoneModalError(null);
    const isEditMode = milestoneModalMode === 'edit' && editingMilestone;
    const url = isEditMode ? `/api/roadmap/milestones/${editingMilestone.id}` : '/api/roadmap/milestones';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
        throw new Error(errorData.message || `Failed to ${method === 'POST' ? 'create' : 'update'} milestone`);
      }
      await fetchData(); // Refetch all data (items and milestones)
      closeMilestoneModal();
    } catch (error: any) {
      console.error(`Context: Error ${method === 'POST' ? 'creating' : 'updating'} milestone:`, error);
      setMilestoneModalError(error.message || 'An unexpected error occurred.');
    }
  }, [milestoneModalMode, editingMilestone, fetchData, closeMilestoneModal]);

  const deleteMilestone = useCallback(async (milestoneId: string) => {
    // We could set milestoneModalError here if the modal is open and an error occurs,
    // but typically delete actions might show a toast or page-level notification.
    // For now, similar to deleteItem, we'll log and re-throw.
    try {
      const response = await fetch(`/api/roadmap/milestones/${milestoneId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
        throw new Error(errorData.message || 'Failed to delete milestone');
      }
      await fetchData(); // Refetch all data
    } catch (error: any) {
      console.error("Context: Error deleting milestone:", error);
      // Potentially set a general page error or rely on component to show toast
      throw error; 
    }
  }, [fetchData]);

  // Derived Data Calculation (based on focus, sort, history)
  const { displayedItems, displayedMilestones, historicalMilestoneCount } = useMemo(() => {
    
    // 1. Filter Milestones by History
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sortedMilestones = [...allMilestones].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });
    
    const filteredMilestonesByHistory = showHistorical
        ? sortedMilestones
        : sortedMilestones.filter(milestone => {
            const milestoneDate = new Date(milestone.date);
            milestoneDate.setHours(0, 0, 0, 0);
            return milestoneDate >= today;
        });
    
    const count = sortedMilestones.length - filteredMilestonesByHistory.length;

    // 2. Filter Items and Milestones by Focus
    if (!focusedItemId) {
        // No focus: Use history-filtered milestones and all items relevant to them
        const relevantMilestoneIds = new Set(filteredMilestonesByHistory.map(m => m.id));
        const itemsForHistoryMilestones = allItems.filter(item => relevantMilestoneIds.has(item.milestoneId));
        return { 
            displayedItems: itemsForHistoryMilestones, 
            displayedMilestones: filteredMilestonesByHistory,
            historicalMilestoneCount: count
         };
    } else {
        // Focus active: Find focused item and its relations
        const focusedItem = allItems.find(item => item.id === focusedItemId);
        if (!focusedItem) {
            console.warn(`Layout: Focused item ID ${focusedItemId} not found.`);
            setFocusedItemId(null); // Auto-clear focus if item disappears
            return { 
                displayedItems: allItems, // Fallback to all items/milestones
                displayedMilestones: sortedMilestones, 
                historicalMilestoneCount: count 
            }; 
        }

        const relatedIds = new Set<string>();
        relatedIds.add(focusedItemId);
        (focusedItem.relatedItems || []).forEach(item => relatedIds.add(item.id));
        // Iterate all items to find those related *to* the focused one
        allItems.forEach(item => {
            if (item.relatedItems?.some(rel => rel.id === focusedItemId)) {
                relatedIds.add(item.id);
            }
        });

        const filteredItemsByFocus = allItems.filter(item => relatedIds.has(item.id));
        const relevantMilestoneIdsFocus = new Set(filteredItemsByFocus.map(item => item.milestoneId));
        
        // Apply sorting *after* finding relevant milestones for focus
        const filteredMilestonesByFocusAndSorted = [...allMilestones]
            .filter(m => relevantMilestoneIdsFocus.has(m.id))
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
            });

        return { 
            displayedItems: filteredItemsByFocus, 
            displayedMilestones: filteredMilestonesByFocusAndSorted,
            historicalMilestoneCount: 0 // Or calculate differently if needed for focus view
        };
    }

  }, [focusedItemId, allItems, allMilestones, showHistorical, sortDirection]);

  // Loading State Handling
  if (isAuthLoading || (isAuthenticated && isLoadingRoadmapData)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
     return (
       <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Redirecting to login...</span> 
       </div>
     );
  }

  if (apiError) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center text-destructive">
        <p>Error loading roadmap data: {apiError}</p>
        <Button onClick={fetchData} className="mt-4">Retry</Button>
      </div>
    );
  }

  // Define navigation links
  const navLinks = [
    { href: '/roadmap', label: 'Roadmap View' },
    { href: '/category', label: 'Category View' },
    { href: '/timeline', label: 'Timeline View' },
    // Conditionally add editor link
    ...(isEditor ? [{ href: '/editor', label: 'Editor View' }] : []),
  ];

  // Context Value
  const contextValue: RoadmapContextProps = {
    allItems,
    allMilestones,
    isLoadingData: isLoadingRoadmapData,
    apiError,
    fetchData,
    sortDirection,
    toggleSortDirection,
    showHistorical,
    toggleHistorical,
    focusedItemId,
    setFocusedItemId,
    displayedItems,
    displayedMilestones,
    isEditor,
    historicalMilestoneCount,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    categories, // <-- Pass categories to context value
    // Item Modal related
    isItemModalOpen,
    itemModalMode,
    editingItem,
    targetMilestoneId,
    openItemModal,
    closeItemModal,
    saveItem,       // Add saveItem
    deleteItem,     // Add deleteItem
    itemModalError, // Add itemModalError
    // Milestone Modal related
    isMilestoneModalOpen,
    milestoneModalMode,
    editingMilestone,
    openMilestoneModal,
    closeMilestoneModal,
    saveMilestone,
    milestoneModalError,
    deleteMilestone, // <-- Provide deleteMilestone in context
  };

  return (
    <RoadmapContext.Provider value={contextValue}>
      <div className="p-4 md:p-8 space-y-4">
        {/* --- Header Area --- */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          {/* Left side: Title */} 
          <div> 
            <h1 className="text-3xl font-bold">Company Roadmap</h1>
          </div>
          {/* Right side: Add New Item Button (conditionally for editor page) */}
          <div className="flex items-center gap-2">
            {isEditor && pathname === '/editor' && (
              <>
                <Button onClick={() => openMilestoneModal('create')} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Manage Milestones
                </Button>
                <Button onClick={() => openItemModal('create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Roadmap Item
                </Button>
              </>
            )}
            {/* Other global header controls could go here if needed */}
          </div> 
        </div>

        {/* --- Navigation & Shared Controls Area --- */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Navigation Links (Left Aligned) */}
             <nav className="bg-muted p-1 rounded-md inline-flex gap-1"> 
              {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      isActive 
                        ? "bg-background text-foreground shadow-sm" 
                        : "hover:bg-muted-foreground/10 hover:text-muted-foreground"
                    )}
                    onClick={() => setFocusedItemId(null)} // Clear focus on navigation
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            
            {/* Sort Button (Right Aligned in this row) */}
            <div className="flex items-center gap-2">
                {/* Conditional Category Filter (Rendered by Layout now) */}
                 {pathname === '/category' && !focusedItemId && (
                    <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}> 
                        <SelectTrigger id="category-filter-layout" className="w-[180px]"> 
                            <SelectValue placeholder="Filter category..." /> 
                        </SelectTrigger> 
                        <SelectContent> 
                            <SelectItem value="All">All Categories</SelectItem> 
                            {categories.map(cat => ( 
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem> 
                            ))} 
                        </SelectContent> 
                    </Select> 
                )}
                {/* Sort Button */}
                <Button variant="outline" size="sm" onClick={toggleSortDirection}>
                    {sortDirection === "asc" ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                    {sortDirection === "asc" ? "Earliest first" : "Latest first"}
                </Button>
            </div>
        </div>

        {/* --- Row for Focus Indicator (Below Nav/Sort, Full Width) --- */}
        {focusedItemId && (
          <div className="flex items-center justify-start mb-2">
             {/* Group for Focus Indicators */} 
             <div className="flex items-center gap-2"> 
                {/* Clear Focus Button */} 
                <Button variant="outline" size="sm" onClick={() => setFocusedItemId(null)}> 
                  <X className="mr-2 h-4 w-4" /> 
                  Clear Focus (Show All)
                </Button>
                {/* Focus Message */} 
                <p className="text-sm text-muted-foreground">
                  (Showing items related to: {allItems.find(i => i.id === focusedItemId)?.title || 'selected item'})
                </p>
             </div>
          </div>
        )}

        {/* --- Page Content --- */}
        <div className="grid grid-cols-1">
            {children}
        </div>
      </div>

      {/* --- Item Edit/Create Modal --- */}
      {isItemModalOpen && (
        <Dialog open={isItemModalOpen} onOpenChange={(isOpen) => !isOpen && closeItemModal()}>
          <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {itemModalMode === 'create' ? "Create New Roadmap Item" : "Edit Roadmap Item"}
              </DialogTitle>
              {itemModalMode === 'create' && targetMilestoneId && (
                <DialogDescription>
                  Creating an item under milestone: {allMilestones.find(m => m.id === targetMilestoneId)?.title || 'Selected Milestone'}
                </DialogDescription>
              )}
            </DialogHeader>
            <ItemForm 
              initialData={itemModalMode === 'edit' ? editingItem : undefined}
              milestoneId={itemModalMode === 'create' ? targetMilestoneId : undefined}
              milestones={allMilestones}
              allItems={allItems}
              onSave={saveItem}
              onCancel={closeItemModal}
              mode={itemModalMode || 'create'}
              error={itemModalError}
            />
            {/* DialogFooter could be part of ItemForm or managed here if needed */}
          </DialogContent>
        </Dialog>
      )}

      {/* --- Milestone Management Modal --- */}
      <MilestoneManagementModal /> 

    </RoadmapContext.Provider>
  );
} 