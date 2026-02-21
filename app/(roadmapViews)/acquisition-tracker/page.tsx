"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoadmap } from "../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Settings2, 
  Users, 
  Building2,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowDownAZ,
  ArrowUpZA
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Acquisition, AcquisitionProgress } from "@/types/roadmap";

interface ProgressStep {
  id: string;
  label: string;
  status: 'complete' | 'in-progress' | 'not-started';
  percentage?: number;
  type?: 'standard' | 'boolean' | 'multi-segment';
  statusLabel?: string;
  segments?: {
    complete: number;
    inProgress: number;
    toDo: number;
  };
}

interface ProgressTrackProps {
  title: string;
  icon: React.ReactNode;
  steps: ProgressStep[];
}

function ProgressTrack({ title, icon, steps }: ProgressTrackProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-5 flex-1">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[rgb(2_33_77)] dark:text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-sm uppercase tracking-wide text-[rgb(2_33_77)] dark:text-foreground">
          {title}
        </h3>
      </div>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={cn(
              "bg-background rounded-lg p-4 border",
              step.status === 'in-progress' && "border-[rgb(2_33_77)] dark:border-primary shadow-sm"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {step.status === 'complete' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : step.status === 'in-progress' ? (
                  <Clock className="h-5 w-5 text-[rgb(2_33_77)] dark:text-primary shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <span className="font-medium text-sm">
                  {index + 1}. {step.label}
                </span>
              </div>
              <Badge 
                variant={step.status === 'complete' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs",
                  step.status === 'complete' && "bg-emerald-500 hover:bg-emerald-600",
                  step.status === 'in-progress' && "bg-[rgb(2_33_77)] text-white dark:bg-primary"
                )}
              >
                {step.statusLabel || (step.status === 'complete' ? 'Complete' : step.status === 'in-progress' ? 'In Progress' : 'Not Started')}
              </Badge>
            </div>
            
            {step.type === 'multi-segment' && step.segments && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden mr-3 flex">
                    {step.segments.complete > 0 && (
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${step.segments.complete}%` }}
                      />
                    )}
                    {step.segments.inProgress > 0 && (
                      <div 
                        className="h-full bg-[rgb(2_33_77)] dark:bg-primary transition-all duration-500"
                        style={{ width: `${step.segments.inProgress}%` }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground min-w-[40px] text-right">
                    {step.segments.complete}%
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Complete</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[rgb(2_33_77)] dark:bg-primary" />
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <span>To Do</span>
                  </div>
                </div>
              </div>
            )}
            
            {step.type !== 'boolean' && step.type !== 'multi-segment' && step.percentage !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden mr-3">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        step.status === 'complete' ? "bg-emerald-500" : "bg-[rgb(2_33_77)] dark:bg-primary"
                      )}
                      style={{ width: `${step.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground min-w-[40px] text-right">
                    {step.percentage}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface AcquisitionCardProps {
  acquisition: Acquisition;
}

function AcquisitionCard({ acquisition }: AcquisitionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const progress = acquisition.progress;
  
  if (!progress) {
    return (
      <Card id={acquisition.id} className="mb-6 scroll-mt-24">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 
              className="h-6 w-6" 
              style={{ color: acquisition.color || 'rgb(2, 33, 77)' }}
            />
            <h2 className="text-xl font-bold">{acquisition.name}</h2>
          </div>
          <p className="text-muted-foreground">No progress data available for this acquisition.</p>
        </CardContent>
      </Card>
    );
  }

  const totalEpics = progress.functionalityEpicsToDo + progress.functionalityEpicsInProgress + progress.functionalityEpicsComplete;
  const epicsCompletePercentage = totalEpics > 0 
    ? Math.round((progress.functionalityEpicsComplete / totalEpics) * 100) 
    : 0;
  const epicsInProgressPercentage = totalEpics > 0
    ? Math.round((progress.functionalityEpicsInProgress / totalEpics) * 100)
    : 0;
  const epicsToDoPercentage = totalEpics > 0
    ? Math.round((progress.functionalityEpicsToDo / totalEpics) * 100)
    : 0;

  const clientAccessPercentage = progress.clientCountTotal > 0 
    ? Math.round((progress.clientAccessCount / progress.clientCountTotal) * 100) 
    : 0;
  const clientActivePercentage = progress.clientCountTotal > 0 
    ? Math.round((progress.clientActiveCount / progress.clientCountTotal) * 100) 
    : 0;

  const functionalityStatus = epicsCompletePercentage === 100 
    ? 'complete' 
    : (epicsCompletePercentage > 0 || epicsInProgressPercentage > 0) 
      ? 'in-progress' 
      : 'not-started';

  const technicalSteps: ProgressStep[] = [
    {
      id: 'devPlatform',
      label: 'Dev Platform',
      type: 'boolean',
      status: progress.devPlatform ? 'complete' : 'not-started',
      statusLabel: progress.devPlatform ? 'Connected' : 'Not Connected',
    },
    {
      id: 'functionality',
      label: 'Functionality in Console',
      type: 'multi-segment',
      status: functionalityStatus,
      segments: {
        complete: epicsCompletePercentage,
        inProgress: epicsInProgressPercentage,
        toDo: epicsToDoPercentage,
      },
    },
  ];

  const clientSteps: ProgressStep[] = [
    {
      id: 'clientAccess',
      label: 'Clients With Access to Console',
      status: clientAccessPercentage === 100 ? 'complete' : clientAccessPercentage > 0 ? 'in-progress' : 'not-started',
      percentage: clientAccessPercentage,
    },
    {
      id: 'clientActive',
      label: 'Clients Active in the Console',
      status: clientActivePercentage === 100 ? 'complete' : clientActivePercentage > 0 ? 'in-progress' : 'not-started',
      percentage: clientActivePercentage,
    },
  ];

  const devPlatformProgress = progress.devPlatform ? 100 : 0;
  const functionalityProgress = epicsCompletePercentage;
  const technicalProgress = (devPlatformProgress + functionalityProgress) / 2;
  const clientProgress = clientSteps.reduce((acc, step) => acc + (step.percentage || 0), 0) / clientSteps.length;
  const overallProgress = Math.round((technicalProgress + clientProgress) / 2);

  return (
    <Card id={acquisition.id} className="mb-6 overflow-hidden scroll-mt-24">
      <CardContent className="p-0">
        <div 
          className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Building2 
                className="h-6 w-6" 
                style={{ color: acquisition.color || 'rgb(2, 33, 77)' }}
              />
              <h2 className="text-xl font-bold uppercase tracking-wide">{acquisition.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              {progress.disposition && (
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    progress.disposition === 'Standalone' && "border-blue-500 text-blue-600 dark:text-blue-400",
                    progress.disposition === 'Wrapped' && "border-violet-500 text-violet-600 dark:text-violet-400",
                    progress.disposition === 'Deprecating' && "border-amber-500 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {progress.disposition}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="shrink-0">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          {acquisition.description && (
            <p className="text-sm text-muted-foreground mb-4 ml-9">{acquisition.description}</p>
          )}
          
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Integration Progress</span>
              <span className="text-2xl font-bold text-[rgb(2_33_77)] dark:text-primary">
                {overallProgress}%
                <span className="text-sm font-normal text-muted-foreground ml-2">Combined Status</span>
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-6 pb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <ProgressTrack 
                title="Technical Integration"
                icon={<Settings2 className="h-5 w-5" />}
                steps={technicalSteps}
              />
              <ProgressTrack 
                title="Client Migrations"
                icon={<Users className="h-5 w-5" />}
                steps={clientSteps}
              />
            </div>
            
            {acquisition.integrationOverview && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Integration Overview</h4>
                <p className="text-sm text-muted-foreground">{acquisition.integrationOverview}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AcquisitionTrackerPage() {
  const { isEditor, setHeaderActions } = useRoadmap();
  
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/acquisitions');
      if (!response.ok) throw new Error('Failed to fetch acquisitions');
      const data = await response.json();
      setAcquisitions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isLoading && acquisitions.length > 0) {
      const hash = window.location.hash;
      if (hash) {
        const elementId = hash.substring(1);
        const element = document.getElementById(elementId);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    }
  }, [isLoading, acquisitions]);

  const filteredAndSortedAcquisitions = useMemo(() => {
    let filtered = acquisitions;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = acquisitions.filter(a => 
        a.name.toLowerCase().includes(term)
      );
    }
    
    return [...filtered].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortDirection === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }, [acquisitions, searchTerm, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search acquisitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={toggleSortDirection}>
          {sortDirection === "asc" ? (
            <ArrowDownAZ className="mr-2 h-4 w-4" />
          ) : (
            <ArrowUpZA className="mr-2 h-4 w-4" />
          )}
          {sortDirection === "asc" ? "A-Z" : "Z-A"}
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, searchTerm, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading acquisition progress...</span>
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

  const acquisitionsWithProgress = filteredAndSortedAcquisitions.filter(a => a.progress);
  const acquisitionsWithoutProgress = filteredAndSortedAcquisitions.filter(a => !a.progress);

  return (
    <div className="space-y-6">
      {acquisitions.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Acquisitions Yet</h3>
            <p className="text-muted-foreground">
              Add acquisitions from the Acquisition List page to track their integration progress.
            </p>
          </CardContent>
        </Card>
      ) : filteredAndSortedAcquisitions.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground">
              No acquisitions match "{searchTerm}". Try a different search term.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {acquisitionsWithProgress.length > 0 && (
            <div>
              {acquisitionsWithProgress.map((acquisition) => (
                <AcquisitionCard key={acquisition.id} acquisition={acquisition} />
              ))}
            </div>
          )}
          
          {acquisitionsWithoutProgress.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Acquisitions Without Progress Data
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {acquisitionsWithoutProgress.map((acquisition) => (
                  <Card key={acquisition.id} className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{acquisition.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      No progress tracking data available.
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
