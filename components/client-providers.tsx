"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/auth-context";
import { Providers as ThemeProviders } from "@/components/providers"; // Renamed to avoid naming conflict

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      <AuthProvider>
        <ThemeProviders>{children}</ThemeProviders>
      </AuthProvider>
    </SessionProvider>
  );
} 