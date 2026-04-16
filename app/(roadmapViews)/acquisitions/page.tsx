"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoadmap } from "@/context/roadmap-context";
import { useAcquisitions } from "@/context/acquisition-context";
import { useExportContent } from "@/context/export-content-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, ChevronDown, Building2, Loader2, MoreVertical, FolderKanban, Link2, RefreshCw } from "lucide-react";
import type { Acquisition, Project } from "@/types/roadmap";
import AcquisitionForm from "@/components/acquisition-form";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISPOSITION_META } from "@/lib/constants/dispositions";
import { toast } from "sonner";
import { DispositionBadge } from "@/components/disposition-badge";

export default function AcquisitionListPage() {
  const { isEditor, setHeaderActions } = useRoadmap();
  const { registerPage, registerSection } = useExportContent();
  const searchParams = useSearchParams();
  const isExportMode = searchParams.get('export') === 'true';
  
  const {
    acquisitions,
    projects,
    isLoadingAcquisitions: isLoading,
    acquisitionsError: error,
    fetchAcquisitions: fetchData,
  } = useAcquisitions();
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

  const [isUsageSyncDialogOpen, setIsUsageSyncDialogOpen] = useState(false);
  const [usageBearerToken, setUsageBearerToken] = useState('');
  const [isUsageSyncing, setIsUsageSyncing] = useState(false);
  const [pendingDeleteAcquisitionId, setPendingDeleteAcquisitionId] = useState<string | null>(null);
  
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
      toast.success(acquisitionModalMode === 'create' ? "Acquisition created" : "Acquisition updated");
      closeAcquisitionModal();
    } catch (err: any) {
      setAcquisitionModalError(err.message);
    }
  };

  const deleteAcquisition = (acquisitionId: string) => {
    setPendingDeleteAcquisitionId(acquisitionId);
  };

  const confirmDeleteAcquisition = async () => {
    if (!pendingDeleteAcquisitionId) return;
    try {
      const response = await fetch(`/api/acquisitions/${pendingDeleteAcquisitionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete acquisition');
      await fetchData();
      toast.success("Acquisition deleted");
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setPendingDeleteAcquisitionId(null);
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

  const runUsageSync = useCallback(async () => {
    if (!usageBearerToken.trim()) return;
    setIsUsageSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken: usageBearerToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Usage sync failed');
      const errors = data.errors?.length ? ` | Errors: ${data.errors.slice(0, 3).join('; ')}` : '';
      setSyncMessage({
        type: data.errors?.length ? 'error' : 'success',
        text: `Usage sync complete — ${data.clientsMatched} clients matched, ${data.clientsActivated} activated, ${data.clientsDeactivated} deactivated (${(data.durationMs / 1000).toFixed(1)}s)${errors}`,
      });
      setIsUsageSyncDialogOpen(false);
      setUsageBearerToken('');
      await fetchData();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Usage sync failed' });
    } finally {
      setIsUsageSyncing(false);
    }
  }, [fetchData, usageBearerToken]);

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
          <Button variant="outline" onClick={() => setIsUsageSyncDialogOpen(true)} disabled={isUsageSyncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isUsageSyncing && "animate-spin")} />
            {isUsageSyncing ? "Syncing…" : "Sync Usage"}
          </Button>
          <Button onClick={() => openAcquisitionModal('create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Acquisition
          </Button>
        </div>
      );
    }
    return () => setHeaderActions(null);
  }, [isEditor, isSyncing, isJiraSyncing, isUsageSyncing, runSync, runJiraSync, setHeaderActions]);

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

      {/* Usage Sync Token Dialog */}
      <Dialog open={isUsageSyncDialogOpen} onOpenChange={(open) => { setIsUsageSyncDialogOpen(open); if (!open) setUsageBearerToken(''); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Sync Usage Metrics</DialogTitle>
            <DialogDescription>
              Paste the Core API bearer token below. The sync will match clients by Org ID and update active-in-console status and feature usage flags.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="usage-token">Bearer Token</Label>
            <Textarea
              id="usage-token"
              placeholder="Paste token here…"
              className="font-mono text-xs resize-none h-24"
              value={usageBearerToken}
              onChange={(e) => setUsageBearerToken(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsUsageSyncDialogOpen(false); setUsageBearerToken(''); }}>
              Cancel
            </Button>
            <Button onClick={runUsageSync} disabled={isUsageSyncing || !usageBearerToken.trim()}>
              {isUsageSyncing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing…</> : 'Run Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

              {selectedAcquisitionForDetails?.progress?.disposition && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Acquisition End State</h4>
                    <DispositionBadge
                      disposition={selectedAcquisitionForDetails.progress.disposition}
                      showTooltip={false}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {DISPOSITION_META[selectedAcquisitionForDetails.progress.disposition].description}
                  </p>
                </div>
              )}
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

      <AlertDialog open={!!pendingDeleteAcquisitionId} onOpenChange={(open) => { if (!open) setPendingDeleteAcquisitionId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete acquisition?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the acquisition. Associated projects will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAcquisition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

