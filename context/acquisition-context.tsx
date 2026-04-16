"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Acquisition, Project } from "@/types/roadmap";

interface AcquisitionContextProps {
  acquisitions: Acquisition[];
  projects: Project[];
  isLoadingAcquisitions: boolean;
  acquisitionsError: string | null;
  fetchAcquisitions: () => Promise<void>;
}

const AcquisitionContext = createContext<AcquisitionContextProps | undefined>(undefined);

export function useAcquisitions(): AcquisitionContextProps {
  const context = useContext(AcquisitionContext);
  if (!context) {
    throw new Error("useAcquisitions must be used within an AcquisitionProvider");
  }
  return context;
}

export function AcquisitionProvider({ children }: { children: ReactNode }) {
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingAcquisitions, setIsLoadingAcquisitions] = useState(true);
  const [acquisitionsError, setAcquisitionsError] = useState<string | null>(null);

  const fetchAcquisitions = useCallback(async () => {
    setIsLoadingAcquisitions(true);
    setAcquisitionsError(null);
    try {
      const [acquisitionsRes, projectsRes] = await Promise.all([
        fetch("/api/acquisitions"),
        fetch("/api/projects"),
      ]);
      if (!acquisitionsRes.ok) throw new Error("Failed to fetch acquisitions");
      if (!projectsRes.ok) throw new Error("Failed to fetch projects");
      setAcquisitions(await acquisitionsRes.json());
      setProjects(await projectsRes.json());
    } catch (err: any) {
      setAcquisitionsError(err.message || "Failed to load acquisition data");
    } finally {
      setIsLoadingAcquisitions(false);
    }
  }, []);

  useEffect(() => {
    fetchAcquisitions();
  }, [fetchAcquisitions]);

  return (
    <AcquisitionContext.Provider
      value={{ acquisitions, projects, isLoadingAcquisitions, acquisitionsError, fetchAcquisitions }}
    >
      {children}
    </AcquisitionContext.Provider>
  );
}
