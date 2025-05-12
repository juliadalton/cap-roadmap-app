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
