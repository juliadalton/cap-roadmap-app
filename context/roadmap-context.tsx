"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoadmapItem, Milestone } from "@/types/roadmap";
import { useAuth } from "@/context/auth-context";
import { type SaveMilestoneData } from "@/components/milestone-form";
import { CATEGORIES } from "@/lib/constants/roadmap";

// --- Context Definition ---

export interface RoadmapContextProps {
  // Data
  allItems: RoadmapItem[];
  allMilestones: Milestone[];
  isLoadingData: boolean;
  apiError: string | null;
  fetchData: () => Promise<void>;

  // Shared State & Setters
  sortDirection: "asc" | "desc";
  toggleSortDirection: () => void;
  showHistorical: boolean;
  toggleHistorical: () => void;
  focusedItemId: string | null;
  setFocusedItemId: React.Dispatch<React.SetStateAction<string | null>>;

  // Derived Data
  displayedItems: RoadmapItem[];
  displayedMilestones: Milestone[];

  // Auth
  isEditor: boolean;
  historicalMilestoneCount: number;

  // Category filter
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  categories: string[];

  // Milestone filter
  selectedMilestoneFilter: string;
  setSelectedMilestoneFilter: React.Dispatch<React.SetStateAction<string>>;

  // Item Modal
  isItemModalOpen: boolean;
  itemModalMode: "create" | "edit" | null;
  editingItem: RoadmapItem | null;
  targetMilestoneId: string | null;
  openItemModal: (mode: "create" | "edit", data?: RoadmapItem | string) => void;
  closeItemModal: () => void;
  saveItem: (itemData: Partial<RoadmapItem> & { relatedItemIds?: string[] }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  itemModalError: string | null;

  // Milestone Modal
  isMilestoneModalOpen: boolean;
  milestoneModalMode: "create" | "edit" | null;
  editingMilestone: Milestone | null;
  openMilestoneModal: (mode: "create" | "edit", data?: Milestone) => void;
  closeMilestoneModal: () => void;
  saveMilestone: (milestoneData: SaveMilestoneData) => Promise<void>;
  milestoneModalError: string | null;
  deleteMilestone: (milestoneId: string) => Promise<void>;

  // Page-specific header actions (registered by pages)
  headerActions: React.ReactNode;
  setHeaderActions: React.Dispatch<React.SetStateAction<React.ReactNode>>;
}

const RoadmapContext = createContext<RoadmapContextProps | undefined>(undefined);

export const useRoadmap = (): RoadmapContextProps => {
  const context = useContext(RoadmapContext);
  if (!context) {
    throw new Error("useRoadmap must be used within a RoadmapProvider");
  }
  return context;
};

// --- Provider ---

const categories: string[] = [...CATEGORIES];

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const { userRole, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isEditor = userRole === "editor";
  const router = useRouter();

  // Data
  const [allItems, setAllItems] = useState<RoadmapItem[]>([]);
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [isLoadingRoadmapData, setIsLoadingRoadmapData] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Shared UI
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showHistorical, setShowHistorical] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedMilestoneFilter, setSelectedMilestoneFilter] = useState<string>("All");

  // Item modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [targetMilestoneId, setTargetMilestoneId] = useState<string | null>(null);
  const [itemModalError, setItemModalError] = useState<string | null>(null);

  // Milestone modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneModalMode, setMilestoneModalMode] = useState<"create" | "edit" | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneModalError, setMilestoneModalError] = useState<string | null>(null);

  // Header actions (registered by pages)
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  // Data fetching
  const fetchData = useCallback(async () => {
    setIsLoadingRoadmapData(true);
    setApiError(null);
    try {
      const milestonesResponse = await fetch("/api/roadmap/milestones");
      if (!milestonesResponse.ok) {
        throw new Error(`Failed to fetch milestones: ${milestonesResponse.statusText}`);
      }
      const milestonesData: Milestone[] = await milestonesResponse.json();

      const itemsResponse = await fetch("/api/roadmap/items");
      if (!itemsResponse.ok) {
        throw new Error(`Failed to fetch roadmap items: ${itemsResponse.statusText}`);
      }
      const itemsData: RoadmapItem[] = await itemsResponse.json();

      setAllMilestones(milestonesData);
      setAllItems(itemsData);
    } catch (error: any) {
      console.error("RoadmapProvider: Error fetching data:", error);
      setApiError(error.message || "An unknown error occurred while fetching data.");
    } finally {
      setIsLoadingRoadmapData(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

  // Auth redirect
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Toggles
  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const toggleHistorical = useCallback(() => {
    setShowHistorical((prev) => !prev);
  }, []);

  // Item modal handlers
  const openItemModal = useCallback((mode: "create" | "edit", data?: RoadmapItem | string) => {
    setIsItemModalOpen(true);
    setItemModalMode(mode);
    setItemModalError(null);
    if (mode === "edit" && typeof data === "object" && data !== null && "id" in data) {
      setEditingItem(data as RoadmapItem);
      setTargetMilestoneId(null);
    } else if (mode === "create" && typeof data === "string") {
      setTargetMilestoneId(data);
      setEditingItem(null);
    } else {
      setEditingItem(null);
      setTargetMilestoneId(null);
    }
  }, []);

  const closeItemModal = useCallback(() => {
    setIsItemModalOpen(false);
    setItemModalMode(null);
    setEditingItem(null);
    setTargetMilestoneId(null);
    setItemModalError(null);
  }, []);

  const saveItem = useCallback(
    async (itemData: Partial<RoadmapItem> & { relatedItemIds?: string[] }) => {
      setItemModalError(null);
      const isEditMode = itemModalMode === "edit" && editingItem;
      const url = isEditMode ? `/api/roadmap/items/${editingItem.id}` : "/api/roadmap/items";
      const method = isEditMode ? "PATCH" : "POST";

      let payload: any = { ...itemData };
      if (itemModalMode === "create" && targetMilestoneId) {
        payload.milestoneId = targetMilestoneId;
      } else if (isEditMode) {
        payload.milestoneId = itemData.milestoneId || editingItem.milestoneId;
      }
      if (itemModalMode === "create" && !payload.milestoneId) {
        setItemModalError("Milestone ID is missing for new item.");
        return;
      }

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
          throw new Error(errorData.message || `Failed to ${method === "POST" ? "create" : "update"} item`);
        }
        await fetchData();
        closeItemModal();
      } catch (error: any) {
        console.error(`RoadmapProvider: Error ${method === "POST" ? "creating" : "updating"} item:`, error);
        setItemModalError(error.message || "An unexpected error occurred.");
      }
    },
    [itemModalMode, editingItem, targetMilestoneId, fetchData, closeItemModal]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(`/api/roadmap/items/${itemId}`, { method: "DELETE" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
          throw new Error(errorData.message || "Failed to delete item");
        }
        await fetchData();
      } catch (error: any) {
        console.error("RoadmapProvider: Error deleting item:", error);
        throw error;
      }
    },
    [fetchData]
  );

  // Milestone modal handlers
  const openMilestoneModal = useCallback((mode: "create" | "edit", data?: Milestone) => {
    setIsMilestoneModalOpen(true);
    setMilestoneModalMode(mode);
    setMilestoneModalError(null);
    setEditingMilestone(mode === "edit" && data ? data : null);
  }, []);

  const closeMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(false);
    setMilestoneModalMode(null);
    setEditingMilestone(null);
    setMilestoneModalError(null);
  }, []);

  const saveMilestone = useCallback(
    async (milestoneData: SaveMilestoneData) => {
      setMilestoneModalError(null);
      const isEditMode = milestoneModalMode === "edit" && editingMilestone;
      const url = isEditMode ? `/api/roadmap/milestones/${editingMilestone.id}` : "/api/roadmap/milestones";
      const method = isEditMode ? "PATCH" : "POST";
      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(milestoneData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
          throw new Error(errorData.message || `Failed to ${method === "POST" ? "create" : "update"} milestone`);
        }
        await fetchData();
        closeMilestoneModal();
      } catch (error: any) {
        console.error(`RoadmapProvider: Error ${method === "POST" ? "creating" : "updating"} milestone:`, error);
        setMilestoneModalError(error.message || "An unexpected error occurred.");
      }
    },
    [milestoneModalMode, editingMilestone, fetchData, closeMilestoneModal]
  );

  const deleteMilestone = useCallback(
    async (milestoneId: string) => {
      try {
        const response = await fetch(`/api/roadmap/milestones/${milestoneId}`, { method: "DELETE" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
          throw new Error(errorData.message || "Failed to delete milestone");
        }
        await fetchData();
      } catch (error: any) {
        console.error("RoadmapProvider: Error deleting milestone:", error);
        throw error;
      }
    },
    [fetchData]
  );

  // Derived data
  const { displayedItems, displayedMilestones, historicalMilestoneCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedMilestones = [...allMilestones].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    const filteredByHistory = showHistorical
      ? sortedMilestones
      : sortedMilestones.filter((m) => {
          const d = new Date(m.date);
          d.setHours(0, 0, 0, 0);
          return d >= today;
        });

    const count = sortedMilestones.length - filteredByHistory.length;

    const filteredByMilestone =
      selectedMilestoneFilter !== "All"
        ? filteredByHistory.filter((m) => m.id === selectedMilestoneFilter)
        : filteredByHistory;

    if (!focusedItemId) {
      const relevantIds = new Set(filteredByMilestone.map((m) => m.id));
      return {
        displayedItems: allItems.filter((item) => relevantIds.has(item.milestoneId)),
        displayedMilestones: filteredByMilestone,
        historicalMilestoneCount: count,
      };
    }

    const focusedItem = allItems.find((item) => item.id === focusedItemId);
    if (!focusedItem) {
      console.warn(`RoadmapProvider: Focused item ID ${focusedItemId} not found.`);
      setFocusedItemId(null);
      return { displayedItems: allItems, displayedMilestones: sortedMilestones, historicalMilestoneCount: count };
    }

    const relatedIds = new Set<string>([focusedItemId]);
    (focusedItem.relatedItems || []).forEach((item) => relatedIds.add(item.id));
    allItems.forEach((item) => {
      if (item.relatedItems?.some((rel) => rel.id === focusedItemId)) relatedIds.add(item.id);
    });

    const focusedItems = allItems.filter((item) => relatedIds.has(item.id));
    const focusedMilestoneIds = new Set(focusedItems.map((item) => item.milestoneId));
    const focusedMilestones = [...allMilestones]
      .filter((m) => focusedMilestoneIds.has(m.id))
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      });

    return { displayedItems: focusedItems, displayedMilestones: focusedMilestones, historicalMilestoneCount: 0 };
  }, [focusedItemId, allItems, allMilestones, showHistorical, sortDirection, selectedMilestoneFilter]);

  // Loading / auth guard states — rendered by the provider so the layout chrome never mounts without data
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
        <Button onClick={fetchData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

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
    categories,
    selectedMilestoneFilter,
    setSelectedMilestoneFilter,
    isItemModalOpen,
    itemModalMode,
    editingItem,
    targetMilestoneId,
    openItemModal,
    closeItemModal,
    saveItem,
    deleteItem,
    itemModalError,
    isMilestoneModalOpen,
    milestoneModalMode,
    editingMilestone,
    openMilestoneModal,
    closeMilestoneModal,
    saveMilestone,
    milestoneModalError,
    deleteMilestone,
    headerActions,
    setHeaderActions,
  };

  return <RoadmapContext.Provider value={contextValue}>{children}</RoadmapContext.Provider>;
}
