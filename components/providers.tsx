"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { ExportContentProvider } from "@/context/export-content-context"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <ExportContentProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </ExportContentProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )
} 