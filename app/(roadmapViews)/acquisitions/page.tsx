"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoadmap } from "../layout";
import { useExportContent } from "@/context/export-content-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, ChevronDown, Building2, Loader2, MoreVertical, FolderKanban, Link2, RefreshCw } from "lucide-react";
import type { Acquisition, Project } from "@/types/roadmap";
import AcquisitionForm from "@/components/acquisition-form";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISPOSITION_META } from "@/lib/constants/dispositions";

export default function AcquisitionListPage() {
  const { isEditor, setHeaderActions } = useRoadmap();
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
  
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [selectedAcquisitionForProjects, setSelectedAcquisitionForProjects] = useState<{ acquisition: Acquisition; projects: Project[] } | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAcquisitionForDetails, setSelectedAcquisitionForDetails] = useState<Acquisition | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isJiraSyncing, setIsJiraSyncing] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    registerPage({
      id: 'acquisitions',
      name: 'Acquisition List',
      path: '/acquisitions',
    });

    registerSection({
      id: 'acquisition-grid',
      pageId: 'acquisitions',
      pageName: 'Acquisition List',
      sectionName: 'All Acquisitions',
      description: 'Grid view of all tracked acquisitions',
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

  const getAcquisitionProjects = useCallback((acquisitionId: string) => {
    return projects.filter(p => 
      p.acquisitions?.some(a => a.id === acquisitionId)
    );
  }, [projects]);

  const sortedAcquisitions = useMemo(() => {
    return [...acquisitions].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [acquisitions]);

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

  const openProjectsModal = (acquisition: Acquisition, acqProjects: Project[]) => {
    setSelectedAcquisitionForProjects({ acquisition, projects: acqProjects });
    setIsProjectsModalOpen(true);
  };

  const closeProjectsModal = () => {
    setIsProjectsModalOpen(false);
    setSelectedAcquisitionForProjects(null);
  };

  const openDetailsModal = (acquisition: Acquisition) => {
    setSelectedAcquisitionForDetails(acquisition);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAcquisitionForDetails(null);
  };

  const saveAcquisition = async (data: { name: string; description?: string; integrationOverview?: string; color?: string; disposition?: string | null; manualSync?: boolean }) => {
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

  const runJiraSync = useCallback(async (dryRun = false) => {
    setIsJiraSyncing(true);
    setSyncMessage(null);
    try {
      const url = dryRun ? '/api/sync/jira?dryRun=true' : '/api/sync/jira';
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Jira sync failed');

      const unmatched = data.unmatchedCompanyNames?.length
        ? ` | Unmatched: ${data.unmatchedCompanyNames.join(', ')}`
        : '';

      const errors = data.errors?.length ? ` | Errors (${data.errors.length}): ${data.errors.slice(0, 3).join('; ')}` : '';

      if (dryRun) {
        setSyncMessage({
          type: 'success',
          text: `[DRY RUN] Would sync ${data.epicsUpserted} epics across ${data.preview?.length ?? 0} rows (${(data.durationMs / 1000).toFixed(1)}s)${unmatched}${errors}`,
        });
      } else {
        setSyncMessage({
          type: data.errors?.length ? 'error' : 'success',
          text: `Jira sync complete — ${data.epicsUpserted} epics synced, ${data.epicsRemoved} removed, ${data.progressRecordsUpdated} acquisitions updated (${(data.durationMs / 1000).toFixed(1)}s)${unmatched}${errors}`,
        });
        await fetchData();
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Jira sync failed' });
    } finally {
      setIsJiraSyncing(false);
    }
  }, [fetchData]);

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync/vitally', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Sync failed');
      setSyncMessage({
        type: 'success',
        text: `Sync complete — ${data.clientsUpserted} clients updated, ${data.clientsMarkedChurned} churned (${(data.durationMs / 1000).toFixed(1)}s)`,
      });
      await fetchData();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (isEditor) {
      setHeaderActions(
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Button
              variant="outline"
              className="rounded-r-none border-r-0"
              onClick={() => runJiraSync(false)}
              disabled={isJiraSyncing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isJiraSyncing && "animate-spin")} />
              {isJiraSyncing ? "Syncing…" : "Sync Jira"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-l-none px-2"
                  disabled={isJiraSyncing}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => runJiraSync(true)}>
                  Dry Run (preview only)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button variant="outline" onClick={runSync} disabled={isSyncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : "Sync Vitally"}
          </Button>
          <Button onClick={() => openAcquisitionModal('create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Acquisition
          </Button>
        </div>
      );
    }
    return () => setHeaderActions(null);
  }, [isEditor, isSyncing, isJiraSyncing, runSync, runJiraSync, setHeaderActions]);

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

  return (
    <div ref={contentRef} data-export-section="acquisition-grid" className="space-y-6">
      {syncMessage && (
        <div className={cn(
          "rounded-md px-4 py-3 text-sm",
          syncMessage.type === 'success' ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
        )}>
          {syncMessage.text}
        </div>
      )}

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedAcquisitions.map((acquisition) => {
            const acqProjects = getAcquisitionProjects(acquisition.id);
            
            return (
              <Card key={acquisition.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 
                        className="h-5 w-5" 
                        style={{ color: acquisition.color || undefined }}
                      />
                      <h3 className="font-semibold text-lg">{acquisition.name}</h3>
                    </div>
                    {isEditor && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
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
                    )}
                  </div>
                  
                  {acquisition.description && (
                    <p className={`text-sm text-muted-foreground mb-4 ${isExportMode ? '' : 'line-clamp-2'}`}>
                      {acquisition.description}
                    </p>
                  )}
                  
                  <button 
                    onClick={() => openProjectsModal(acquisition, acqProjects)}
                    className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
                    disabled={acqProjects.length === 0}
                  >
                    <FolderKanban className="h-4 w-4" />
                    <span className={acqProjects.length > 0 ? "underline underline-offset-2" : ""}>
                      {acqProjects.length} project{acqProjects.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openDetailsModal(acquisition)}
                    >
                      View Details
                    </Button>
                    <Link href={`/acquisition-tracker#${acquisition.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View in Tracker
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isAcquisitionModalOpen} onOpenChange={(open) => !open && closeAcquisitionModal()}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
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
          <ScrollArea className="flex-1 overflow-y-auto">
          <AcquisitionForm
            initialData={editingAcquisition}
            onSave={saveAcquisition}
            onCancel={closeAcquisitionModal}
            mode={acquisitionModalMode}
            error={acquisitionModalError}
          />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Acquisition Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={(open) => !open && closeDetailsModal()}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2
                className="h-5 w-5 shrink-0"
                style={{ color: selectedAcquisitionForDetails?.color || undefined }}
              />
              {selectedAcquisitionForDetails?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-5 py-2">
              {selectedAcquisitionForDetails?.description ? (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAcquisitionForDetails.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}

              {selectedAcquisitionForDetails?.integrationOverview && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Integration Overview</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAcquisitionForDetails.integrationOverview}
                  </p>
                </div>
              )}

              {selectedAcquisitionForDetails?.progress?.disposition && (() => {
                const meta = DISPOSITION_META[selectedAcquisitionForDetails.progress.disposition];
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Acquisition End State</h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          selectedAcquisitionForDetails.progress.disposition === 'Affiliated' && "border-blue-500 text-blue-600 dark:text-blue-400",
                          selectedAcquisitionForDetails.progress.disposition === 'Connected' && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                          selectedAcquisitionForDetails.progress.disposition === 'Wrapped' && "border-violet-500 text-violet-600 dark:text-violet-400",
                          selectedAcquisitionForDetails.progress.disposition === 'Migrated' && "border-amber-500 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{meta.description}</p>
                  </div>
                );
              })()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectsModalOpen} onOpenChange={(open) => !open && closeProjectsModal()}>
        <DialogContent className="sm:max-w-[525px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 
                className="h-5 w-5" 
                style={{ color: selectedAcquisitionForProjects?.acquisition.color || undefined }}
              />
              Projects for {selectedAcquisitionForProjects?.acquisition.name}
            </DialogTitle>
            <DialogDescription>
              {selectedAcquisitionForProjects?.projects.length || 0} project{(selectedAcquisitionForProjects?.projects.length || 0) !== 1 ? 's' : ''} linked to this acquisition
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {selectedAcquisitionForProjects?.projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects linked to this acquisition yet.
              </div>
            ) : (
              <div>
                {selectedAcquisitionForProjects?.projects.map((project, index) => (
                  <div key={project.id}>
                    {index > 0 && <hr className="my-6 border-border" />}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-base">{project.title}</h3>
                      </div>
                      
                      {project.description && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Description</h4>
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        </div>
                      )}
                      
                      {project.startMilestone && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Start Milestone</h4>
                          <p className="text-sm text-muted-foreground">{project.startMilestone.title}</p>
                        </div>
                      )}
                      
                      {project.endMilestone && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">End Milestone</h4>
                          <p className="text-sm text-muted-foreground">{project.endMilestone.title}</p>
                        </div>
                      )}
                      
                      {project.relevantLinks && project.relevantLinks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Relevant Links</h4>
                          <div className="space-y-2">
                            {project.relevantLinks.map((link, i) => (
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
                      
                      {project.epics && project.epics.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Associated Epics</h4>
                          <div className="space-y-2">
                            {project.epics.map((epic) => (
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
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
