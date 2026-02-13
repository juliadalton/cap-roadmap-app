"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoadmap } from "../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, ChevronDown, Link2, Building2, FolderKanban, Loader2, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Acquisition, Project, Milestone, RelevantLink } from "@/types/roadmap";
import AcquisitionForm from "@/components/acquisition-form";
import ProjectForm, { type SaveProjectData } from "@/components/project-form";

// Color palette for acquisitions (distinct colors for visual separation)
const ACQUISITION_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

const ACQUISITION_COLORS_LIGHT = [
  "bg-blue-100 dark:bg-blue-900/30",
  "bg-emerald-100 dark:bg-emerald-900/30",
  "bg-violet-100 dark:bg-violet-900/30",
  "bg-amber-100 dark:bg-amber-900/30",
  "bg-rose-100 dark:bg-rose-900/30",
  "bg-cyan-100 dark:bg-cyan-900/30",
  "bg-indigo-100 dark:bg-indigo-900/30",
  "bg-teal-100 dark:bg-teal-900/30",
];

export default function AcquisitionsPage() {
  const { allMilestones, isEditor, sortDirection, toggleSortDirection, setHeaderActions } = useRoadmap();
  
  // Data state
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);
  const [acquisitionModalMode, setAcquisitionModalMode] = useState<'create' | 'edit'>('create');
  const [editingAcquisition, setEditingAcquisition] = useState<Acquisition | null>(null);
  const [acquisitionModalError, setAcquisitionModalError] = useState<string | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectModalError, setProjectModalError] = useState<string | null>(null);
  const [preselectedAcquisitionId, setPreselectedAcquisitionId] = useState<string | null>(null);
  
  // Expansion state for acquisitions
  const [expandedAcquisitions, setExpandedAcquisitions] = useState<Record<string, boolean>>({});

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [acquisitionsRes, projectsRes] = await Promise.all([
        fetch('/api/acquisitions'),
        fetch('/api/projects'),
      ]);
      
      if (!acquisitionsRes.ok) throw new Error('Failed to fetch acquisitions');
      if (!projectsRes.ok) throw new Error('Failed to fetch projects');
      
      const acquisitionsData = await acquisitionsRes.json();
      const projectsData = await projectsRes.json();
      
      setAcquisitions(acquisitionsData);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort milestones for the timeline header
  const sortedMilestones = useMemo(() => {
    return [...allMilestones].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [allMilestones, sortDirection]);

  // Create a map of milestone ID to index for positioning
  const milestoneIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    sortedMilestones.forEach((m, index) => {
      map[m.id] = index;
    });
    return map;
  }, [sortedMilestones]);

  // Get projects for an acquisition with their computed span
  const getAcquisitionProjects = useCallback((acquisitionId: string) => {
    return projects.filter(p => 
      p.acquisitions?.some(a => a.id === acquisitionId)
    );
  }, [projects]);

  // Calculate acquisition timeline span based on its projects
  const getAcquisitionTimelineSpan = useCallback((acquisitionId: string): { startIndex: number; endIndex: number } | null => {
    const acqProjects = getAcquisitionProjects(acquisitionId);
    if (acqProjects.length === 0) return null;

    let minIndex = Infinity;
    let maxIndex = -1;

    acqProjects.forEach(project => {
      if (project.startMilestoneId && milestoneIndexMap[project.startMilestoneId] !== undefined) {
        minIndex = Math.min(minIndex, milestoneIndexMap[project.startMilestoneId]);
      }
      if (project.endMilestoneId && milestoneIndexMap[project.endMilestoneId] !== undefined) {
        maxIndex = Math.max(maxIndex, milestoneIndexMap[project.endMilestoneId]);
      }
    });

    if (minIndex === Infinity && maxIndex === -1) return null;
    if (minIndex === Infinity) minIndex = maxIndex;
    if (maxIndex === -1) maxIndex = minIndex;

    return { startIndex: minIndex, endIndex: maxIndex };
  }, [getAcquisitionProjects, milestoneIndexMap]);

  // Modal handlers
  const openAcquisitionModal = (mode: 'create' | 'edit', acquisition?: Acquisition) => {
    setAcquisitionModalMode(mode);
    setEditingAcquisition(acquisition || null);
    setAcquisitionModalError(null);
    setIsAcquisitionModalOpen(true);
  };

  const closeAcquisitionModal = () => {
    setIsAcquisitionModalOpen(false);
    setEditingAcquisition(null);
    setAcquisitionModalError(null);
  };

  const saveAcquisition = async (data: { name: string; description?: string; integrationOverview?: string }) => {
    setAcquisitionModalError(null);
    const isEdit = acquisitionModalMode === 'edit' && editingAcquisition;
    const url = isEdit ? `/api/acquisitions/${editingAcquisition.id}` : '/api/acquisitions';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save acquisition');
      }

      await fetchData();
      closeAcquisitionModal();
    } catch (err: any) {
      setAcquisitionModalError(err.message);
    }
  };

  const deleteAcquisition = async (acquisitionId: string) => {
    if (!window.confirm('Are you sure you want to delete this acquisition? This will not delete associated projects.')) {
      return;
    }

    try {
      const response = await fetch(`/api/acquisitions/${acquisitionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete acquisition');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openProjectModal = (mode: 'create' | 'edit', project?: Project, acquisitionId?: string) => {
    setProjectModalMode(mode);
    setEditingProject(project || null);
    setPreselectedAcquisitionId(acquisitionId || null);
    setProjectModalError(null);
    setIsProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
    setPreselectedAcquisitionId(null);
    setProjectModalError(null);
  };

  const saveProject = async (data: SaveProjectData) => {
    setProjectModalError(null);
    const isEdit = projectModalMode === 'edit' && editingProject;
    const url = isEdit ? `/api/projects/${editingProject.id}` : '/api/projects';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save project');
      }

      await fetchData();
      closeProjectModal();
    } catch (err: any) {
      setProjectModalError(err.message);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleAcquisitionExpansion = (acquisitionId: string) => {
    setExpandedAcquisitions(prev => ({
      ...prev,
      [acquisitionId]: !prev[acquisitionId]
    }));
  };

  // Register header action buttons
  useEffect(() => {
    if (isEditor) {
      setHeaderActions(
        <>
          <Button variant="outline" onClick={() => openProjectModal('create')}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Add Project
          </Button>
          <Button onClick={() => openAcquisitionModal('create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Acquisition
          </Button>
        </>
      );
    }
    // Cleanup on unmount
    return () => setHeaderActions(null);
  }, [isEditor, setHeaderActions]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading acquisitions...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const COLUMN_WIDTH = 160;
  const ROW_LABEL_WIDTH = 280;

  return (
    <div className="space-y-6">
      {/* Sort control - near the table */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={toggleSortDirection}>
          {sortDirection === "asc" ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {sortDirection === "asc" ? "Earliest first" : "Latest first"}
        </Button>
      </div>

      {/* Empty state */}
      {acquisitions.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Acquisitions Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first acquisition to start tracking integration projects.
            </p>
            {isEditor && (
              <Button onClick={() => openAcquisitionModal('create')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Acquisition
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Gantt-style Chart */
        <Card className="overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* Header Row - Milestones */}
              <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                <div 
                  className="shrink-0 p-4 font-semibold border-r bg-muted/50 sticky left-0 z-20"
                  style={{ width: ROW_LABEL_WIDTH }}
                >
                  Acquisition / Project
                </div>
                {sortedMilestones.map((milestone) => (
                  <div 
                    key={milestone.id}
                    className="shrink-0 p-4 text-center border-r"
                    style={{ width: COLUMN_WIDTH }}
                  >
                    <div className="font-semibold text-sm">{milestone.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(milestone.date), "MMM yyyy")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Acquisition Rows */}
              {acquisitions.map((acquisition, acqIndex) => {
                const acqProjects = getAcquisitionProjects(acquisition.id);
                const timelineSpan = getAcquisitionTimelineSpan(acquisition.id);
                const colorIndex = acqIndex % ACQUISITION_COLORS.length;
                const isExpanded = expandedAcquisitions[acquisition.id] ?? true;

                return (
                  <div key={acquisition.id} className="border-b last:border-b-0">
                    {/* Acquisition Header Row */}
                    <div className="flex hover:bg-muted/30 group">
                      <div 
                        className="shrink-0 p-3 border-r bg-background sticky left-0 z-10 flex items-center gap-2"
                        style={{ width: ROW_LABEL_WIDTH }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => toggleAcquisitionExpansion(acquisition.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div className={cn("w-3 h-3 rounded-full shrink-0", ACQUISITION_COLORS[colorIndex])} />
                        <div className="flex-1 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="font-semibold truncate cursor-help">
                                  {acquisition.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-sm">
                                <div className="space-y-2">
                                  <p className="font-semibold">{acquisition.name}</p>
                                  {acquisition.description && (
                                    <p className="text-sm">{acquisition.description}</p>
                                  )}
                                  {acquisition.integrationOverview && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Integration Overview:</p>
                                      <p className="text-sm">{acquisition.integrationOverview}</p>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <div className="text-xs text-muted-foreground">
                            {acqProjects.length} project{acqProjects.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {isEditor && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openProjectModal('create', undefined, acquisition.id)}
                              title="Add project to this acquisition"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openAcquisitionModal('edit', acquisition)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => deleteAcquisition(acquisition.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      
                      {/* Acquisition Timeline Bar */}
                      <div className="flex relative" style={{ width: sortedMilestones.length * COLUMN_WIDTH }}>
                        {sortedMilestones.map((_, idx) => (
                          <div 
                            key={idx}
                            className="shrink-0 border-r h-full"
                            style={{ width: COLUMN_WIDTH }}
                          />
                        ))}
                        {timelineSpan && (
                          <div
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 h-6 rounded-full opacity-60",
                              ACQUISITION_COLORS[colorIndex]
                            )}
                            style={{
                              left: timelineSpan.startIndex * COLUMN_WIDTH + 8,
                              width: (timelineSpan.endIndex - timelineSpan.startIndex + 1) * COLUMN_WIDTH - 16,
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Project Rows (when expanded) */}
                    {isExpanded && acqProjects.map((project) => {
                      const startIndex = project.startMilestoneId ? milestoneIndexMap[project.startMilestoneId] : undefined;
                      const endIndex = project.endMilestoneId ? milestoneIndexMap[project.endMilestoneId] : undefined;
                      
                      return (
                        <div key={project.id} className="flex hover:bg-muted/20 group border-t border-dashed">
                          <div 
                            className="shrink-0 p-2 pl-10 border-r bg-background sticky left-0 z-10 flex items-center gap-2"
                            style={{ width: ROW_LABEL_WIDTH }}
                          >
                            <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-sm truncate cursor-help">
                                      {project.title}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-sm">
                                    <div className="space-y-2">
                                      <p className="font-semibold">{project.title}</p>
                                      {project.description && (
                                        <p className="text-sm">{project.description}</p>
                                      )}
                                      {project.relevantLinks && project.relevantLinks.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Links:</p>
                                          <div className="space-y-1">
                                            {project.relevantLinks.map((link, i) => (
                                              <a
                                                key={i}
                                                href={typeof link === 'object' ? link.url : link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                              >
                                                <Link2 className="h-3 w-3" />
                                                {typeof link === 'object' && link.text ? link.text : 'Link'}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {isEditor && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openProjectModal('edit', project)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => deleteProject(project.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                          
                          {/* Project Timeline Bar */}
                          <div className="flex relative" style={{ width: sortedMilestones.length * COLUMN_WIDTH }}>
                            {sortedMilestones.map((_, idx) => (
                              <div 
                                key={idx}
                                className="shrink-0 border-r h-full"
                                style={{ width: COLUMN_WIDTH }}
                              />
                            ))}
                            {startIndex !== undefined && endIndex !== undefined && (
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-4 rounded",
                                  ACQUISITION_COLORS_LIGHT[colorIndex],
                                  "border-2",
                                  `border-${ACQUISITION_COLORS[colorIndex].replace('bg-', '')}`
                                )}
                                style={{
                                  left: startIndex * COLUMN_WIDTH + 12,
                                  width: Math.max((endIndex - startIndex + 1) * COLUMN_WIDTH - 24, 24),
                                  borderColor: 'currentColor',
                                }}
                              >
                                <div 
                                  className={cn("absolute inset-0 rounded-sm", ACQUISITION_COLORS[colorIndex], "opacity-30")}
                                />
                              </div>
                            )}
                            {startIndex !== undefined && endIndex === undefined && (
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full",
                                  ACQUISITION_COLORS[colorIndex]
                                )}
                                style={{
                                  left: startIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 8,
                                }}
                              />
                            )}
                            {startIndex === undefined && endIndex !== undefined && (
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full",
                                  ACQUISITION_COLORS[colorIndex]
                                )}
                                style={{
                                  left: endIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 8,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      )}

      {/* Acquisition Modal */}
      <Dialog open={isAcquisitionModalOpen} onOpenChange={(open) => !open && closeAcquisitionModal()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {acquisitionModalMode === 'create' ? 'Create New Acquisition' : 'Edit Acquisition'}
            </DialogTitle>
            <DialogDescription>
              {acquisitionModalMode === 'create' 
                ? 'Add a new acquisition to track integration progress.'
                : 'Update acquisition details.'}
            </DialogDescription>
          </DialogHeader>
          <AcquisitionForm
            initialData={editingAcquisition}
            onSave={saveAcquisition}
            onCancel={closeAcquisitionModal}
            mode={acquisitionModalMode}
            error={acquisitionModalError}
          />
        </DialogContent>
      </Dialog>

      {/* Project Modal */}
      <Dialog open={isProjectModalOpen} onOpenChange={(open) => !open && closeProjectModal()}>
        <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {projectModalMode === 'create' ? 'Create New Project' : 'Edit Project'}
            </DialogTitle>
            <DialogDescription>
              {projectModalMode === 'create' 
                ? 'Add a new project to track as part of an acquisition integration.'
                : 'Update project details.'}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            initialData={editingProject}
            acquisitions={acquisitions}
            milestones={allMilestones}
            onSave={saveProject}
            onCancel={closeProjectModal}
            mode={projectModalMode}
            error={projectModalError}
            preselectedAcquisitionId={preselectedAcquisitionId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

