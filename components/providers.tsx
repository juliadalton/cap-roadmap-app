"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { ExportContentProvider } from "@/context/export-content-context"
import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <ExportContentProvider>
            {children}
          </ExportContentProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )
} 