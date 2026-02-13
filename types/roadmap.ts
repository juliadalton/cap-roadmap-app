// Type for relevant links with optional text
export interface RelevantLink {
  url: string
  text?: string // Optional display text
}

export interface RoadmapItem {
  id: string
  title: string
  description?: string | null
  date: string
  status: "planned" | "in-progress" | "completed"
  category: "Product" | "AI" | "Integrations" | string
  milestoneId: string
  milestone?: Milestone
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  updatedBy?: string | null
  pirateMetrics?: string[] | null
  northStarMetrics?: string[] | null
  relatedItemIds?: string[] | null
  relatedItems?: RoadmapItem[] | null
  relatedTo?: RoadmapItem[] | null
  relevantLinks?: RelevantLink[] | null
  productDRI?: string | null
}

export interface Milestone {
  id: string
  title: string
  date: string
}

export interface User {
  id: string
  name: string
  role: "viewer" | "editor"
}

// Acquisition Types
export interface Acquisition {
  id: string
  name: string
  description?: string | null
  integrationOverview?: string | null
  projects?: Project[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  title: string
  description?: string | null
  relevantLinks?: RelevantLink[] | null
  
  // Acquisition relations
  acquisitions?: Acquisition[]
  acquisitionIds?: string[]
  
  // Milestone relations
  startMilestoneId?: string | null
  startMilestone?: Milestone | null
  endMilestoneId?: string | null
  endMilestone?: Milestone | null
  
  createdAt: string
  updatedAt: string
}
