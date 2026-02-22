"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoadmap } from "../layout";
import { useExportContent } from "@/context/export-content-context";
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

const DEFAULT_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#f43f5e", // rose-500
  "#06b6d4", // cyan-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
];

function getAcquisitionColor(acquisition: Acquisition, fallbackIndex: number): string {
  if (acquisition.color) return acquisition.color;
  return DEFAULT_COLORS[fallbackIndex % DEFAULT_COLORS.length];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLightColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
}

export default function TechnicalIntegrationPage() {
  const { allMilestones, isEditor, sortDirection, toggleSortDirection, setHeaderActions } = useRoadmap();
  const { registerPage, registerSection } = useExportContent();
  const searchParams = useSearchParams();
  const isExportMode = searchParams.get('export') === 'true';
  
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);
  const [acquisitionModalMode, setAcquisitionModalMode] = useState<'create' | 'edit'>('create');
  const [editingAcquisition, setEditingAcquisition] = useState<Acquisition | null>(null);
  const [acquisitionModalError, setAcquisitionModalError] = useState<string | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectModalError, setProjectModalError] = useState<string | null>(null);
  const [preselectedAcquisitionId, setPreselectedAcquisitionId] = useState<string | null>(null);
  
  const [expandedAcquisitions, setExpandedAcquisitions] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'acquisition' | 'project'>('acquisition');
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    registerPage({
      id: 'technical-integration',
      name: 'Technical Integration Review',
      path: '/technical-integration',
    });

    registerSection({
      id: 'integration-timeline',
      pageId: 'technical-integration',
      pageName: 'Technical Integration Review',
      sectionName: 'Integration Timeline',
      description: 'Gantt-style view of acquisition projects',
      order: 1,
      elementRef: contentRef.current,
    });
  }, [mounted, registerPage, registerSection]);

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

  const sortedMilestones = useMemo(() => {
    return [...allMilestones].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [allMilestones, sortDirection]);

  const sortedAcquisitions = useMemo(() => {
    return [...acquisitions].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [acquisitions]);

  const milestoneIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    sortedMilestones.forEach((m, index) => {
      map[m.id] = index;
    });
    return map;
  }, [sortedMilestones]);

  const getAcquisitionProjects = useCallback((acquisitionId: string) => {
    return projects.filter(p => 
      p.acquisitions?.some(a => a.id === acquisitionId)
    );
  }, [projects]);

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

  const saveAcquisition = async (data: { name: string; description?: string; integrationOverview?: string; color?: string }) => {
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
      [acquisitionId]: prev[acquisitionId] === undefined ? false : !prev[acquisitionId]
    }));
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: prev[projectId] === undefined ? false : !prev[projectId]
    }));
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => 
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }, [projects]);

  const getProjectAcquisitions = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.acquisitions) return [];
    return acquisitions.filter(a => 
      project.acquisitions?.some(pa => pa.id === a.id)
    );
  }, [projects, acquisitions]);

  const getProjectTimelineSpan = useCallback((projectId: string): { startIndex: number; endIndex: number } | null => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    const startIndex = project.startMilestoneId ? milestoneIndexMap[project.startMilestoneId] : undefined;
    const endIndex = project.endMilestoneId ? milestoneIndexMap[project.endMilestoneId] : undefined;

    if (startIndex === undefined && endIndex === undefined) return null;
    
    return { 
      startIndex: startIndex ?? endIndex!, 
      endIndex: endIndex ?? startIndex! 
    };
  }, [projects, milestoneIndexMap]);

  const getProjectColor = useCallback((projectId: string, index: number): string => {
    const projectAcquisitions = getProjectAcquisitions(projectId);
    if (projectAcquisitions.length > 0 && projectAcquisitions[0].color) {
      return projectAcquisitions[0].color;
    }
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  }, [getProjectAcquisitions]);

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
    return () => setHeaderActions(null);
  }, [isEditor, setHeaderActions]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading acquisitions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const COLUMN_WIDTH = isExportMode ? 180 : 160;
  const ROW_LABEL_WIDTH = isExportMode ? 400 : 280;

  return (
    <div ref={contentRef} data-export-section="integration-timeline" className="space-y-6">
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
        <>
          {!isExportMode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Group by:</span>
                <div className="flex rounded-lg border bg-muted p-1">
                  <Button
                    variant={viewMode === 'acquisition' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setViewMode('acquisition')}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    Acquisition
                  </Button>
                  <Button
                    variant={viewMode === 'project' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setViewMode('project')}
                  >
                    <FolderKanban className="h-4 w-4 mr-1" />
                    Project
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <Card className="overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                <div 
                  className="shrink-0 p-4 font-semibold border-r bg-muted/50 sticky left-0 z-20"
                  style={{ width: ROW_LABEL_WIDTH }}
                >
                  {viewMode === 'acquisition' ? 'Acquisition / Project' : 'Project / Acquisition'}
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

              {viewMode === 'acquisition' && sortedAcquisitions.map((acquisition, acqIndex) => {
                const acqProjects = getAcquisitionProjects(acquisition.id);
                const timelineSpan = getAcquisitionTimelineSpan(acquisition.id);
                const acqColor = getAcquisitionColor(acquisition, acqIndex);
                const isExpanded = expandedAcquisitions[acquisition.id] ?? true;

                return (
                  <div key={acquisition.id} className="border-b last:border-b-0">
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
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: acqColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold ${isExportMode ? '' : 'truncate'}`}>
                            {acquisition.name}
                          </div>
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
                            className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full opacity-60"
                            style={{
                              left: timelineSpan.startIndex * COLUMN_WIDTH + 8,
                              width: (timelineSpan.endIndex - timelineSpan.startIndex + 1) * COLUMN_WIDTH - 16,
                              backgroundColor: acqColor,
                            }}
                          />
                        )}
                      </div>
                    </div>

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
                              <button
                                onClick={() => setViewingProject(project)}
                                className={`text-sm ${isExportMode ? '' : 'truncate'} cursor-pointer hover:text-[rgb(2_33_77)] dark:hover:text-primary hover:underline text-left w-full`}
                              >
                                {project.title}
                              </button>
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
                                className="absolute top-1/2 -translate-y-1/2 h-4 rounded border-2"
                                style={{
                                  left: startIndex * COLUMN_WIDTH + 12,
                                  width: Math.max((endIndex - startIndex + 1) * COLUMN_WIDTH - 24, 24),
                                  borderColor: acqColor,
                                  backgroundColor: getLightColor(acqColor),
                                }}
                              >
                                <div 
                                  className="absolute inset-0 rounded-sm opacity-30"
                                  style={{ backgroundColor: acqColor }}
                                />
                              </div>
                            )}
                            {startIndex !== undefined && endIndex === undefined && (
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full"
                                style={{
                                  left: startIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 8,
                                  backgroundColor: acqColor,
                                }}
                              />
                            )}
                            {startIndex === undefined && endIndex !== undefined && (
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full"
                                style={{
                                  left: endIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 8,
                                  backgroundColor: acqColor,
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

              {viewMode === 'project' && sortedProjects.map((project, projIndex) => {
                const projectAcquisitions = getProjectAcquisitions(project.id);
                const timelineSpan = getProjectTimelineSpan(project.id);
                const projColor = getProjectColor(project.id, projIndex);
                const isExpanded = expandedProjects[project.id] ?? true;
                const startIndex = project.startMilestoneId ? milestoneIndexMap[project.startMilestoneId] : undefined;
                const endIndex = project.endMilestoneId ? milestoneIndexMap[project.endMilestoneId] : undefined;

                return (
                  <div key={project.id} className="border-b last:border-b-0">
                    <div className="flex hover:bg-muted/30 group">
                      <div 
                        className="shrink-0 p-3 border-r bg-background sticky left-0 z-10 flex items-center gap-2"
                        style={{ width: ROW_LABEL_WIDTH }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => toggleProjectExpansion(project.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <FolderKanban className="h-4 w-4 shrink-0" style={{ color: projColor }} />
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setViewingProject(project)}
                            className={`font-semibold ${isExportMode ? '' : 'truncate'} cursor-pointer hover:text-[rgb(2_33_77)] dark:hover:text-primary hover:underline text-left w-full`}
                          >
                            {project.title}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {projectAcquisitions.length} acquisition{projectAcquisitions.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {isEditor && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openProjectModal('edit', project)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Project
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
                            className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full opacity-60"
                            style={{
                              left: timelineSpan.startIndex * COLUMN_WIDTH + 8,
                              width: (timelineSpan.endIndex - timelineSpan.startIndex + 1) * COLUMN_WIDTH - 16,
                              backgroundColor: projColor,
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {isExpanded && projectAcquisitions.map((acquisition) => {
                      const acqColor = acquisition.color || projColor;
                      
                      return (
                        <div key={acquisition.id} className="flex hover:bg-muted/20 group border-t border-dashed">
                          <div 
                            className="shrink-0 p-2 pl-10 border-r bg-background sticky left-0 z-10 flex items-center gap-2"
                            style={{ width: ROW_LABEL_WIDTH }}
                          >
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" style={{ color: acqColor }} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm ${isExportMode ? '' : 'truncate'}`}>
                                {acquisition.name}
                              </div>
                            </div>
                            {isEditor && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex shrink-0">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openAcquisitionModal('edit', acquisition)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Acquisition
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex relative" style={{ width: sortedMilestones.length * COLUMN_WIDTH }}>
                            {sortedMilestones.map((_, idx) => (
                              <div 
                                key={idx}
                                className="shrink-0 border-r h-full"
                                style={{ width: COLUMN_WIDTH }}
                              />
                            ))}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full"
                              style={{
                                left: (timelineSpan?.startIndex ?? 0) * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 6,
                                backgroundColor: acqColor,
                              }}
                            />
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
        </>
      )}

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

      <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              {viewingProject?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingProject && (
            <div className="space-y-4">
              {viewingProject.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{viewingProject.description}</p>
                </div>
              )}
              
              {viewingProject.startMilestone && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Start Milestone</h4>
                  <p className="text-sm text-muted-foreground">{viewingProject.startMilestone.title}</p>
                </div>
              )}
              
              {viewingProject.endMilestone && (
                <div>
                  <h4 className="text-sm font-medium mb-1">End Milestone</h4>
                  <p className="text-sm text-muted-foreground">{viewingProject.endMilestone.title}</p>
                </div>
              )}
              
              {viewingProject.relevantLinks && viewingProject.relevantLinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Relevant Links</h4>
                  <div className="space-y-2">
                    {viewingProject.relevantLinks.map((link, i) => (
                      <a
                        key={i}
                        href={typeof link === 'object' ? link.url : link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline flex items-center gap-2"
                      >
                        <Link2 className="h-4 w-4" />
                        {typeof link === 'object' && link.text ? link.text : 'Link'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingProject.acquisitions && viewingProject.acquisitions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Associated Acquisitions</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingProject.acquisitions.map((acq) => (
                      <Badge key={acq.id} variant="secondary">
                        {acq.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingProject.epics && viewingProject.epics.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Associated Epics</h4>
                  <div className="space-y-2">
                    {viewingProject.epics.map((epic) => (
                      <div key={epic.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">{epic.epicName}</span>
                        {epic.epicLink && (
                          <a
                            href={epic.epicLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <Link2 className="h-3 w-3" />
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
