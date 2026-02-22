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
export type Disposition = 'Standalone' | 'Wrapped' | 'Deprecating'

export interface Acquisition {
  id: string
  name: string
  description?: string | null
  integrationOverview?: string | null
  color?: string | null
  projects?: Project[]
  progress?: AcquisitionProgress | null
  epics?: FunctionalityEpic[]
  clientCounts?: AcquisitionClientCount[]
  createdAt: string
  updatedAt: string
}

export interface AcquisitionProgress {
  id: string
  acquisitionId: string
  acquisition?: Acquisition
  disposition?: Disposition | null
  devPlatform: boolean
  functionalityEpicsToDo: number
  functionalityEpicsInProgress: number
  functionalityEpicsComplete: number
  clientCountTotal: number
  clientAccessCount: number
  clientActiveCount: number
  manualSync: boolean
  createdAt: string
  updatedAt: string
}

export interface FunctionalityEpic {
  id: string
  acquisitionId: string
  acquisition?: Acquisition
  projectId?: string | null
  project?: Project | null
  epicId: string
  epicName: string
  epicStatus?: string | null
  epicAcquiredCompany?: string | null
  epicLink?: string | null
  createdAt: string
  updatedAt: string
}

export interface AcquisitionClientCount {
  id: string
  acquisitionId: string
  acquisition?: Acquisition
  clientVitallyId: string
  orgId?: string | null
  clientName: string
  activeInConsole: boolean
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
  
  // Functionality epics relation
  epics?: FunctionalityEpic[]
  
  // Milestone relations
  startMilestoneId?: string | null
  startMilestone?: Milestone | null
  endMilestoneId?: string | null
  endMilestone?: Milestone | null
  
  createdAt: string
  updatedAt: string
}
