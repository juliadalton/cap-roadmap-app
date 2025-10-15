import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import UserMenu from "@/components/user-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { ClientProviders } from "@/components/client-providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Capacity Product Roadmap",
  description: "Visual roadmap for Capacity projects and milestones for 2025-2026",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={inter.className}>
        <ClientProviders>
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-[rgb(0_43_103)] dark:bg-background">
              <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-full">
                <Logo />
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <UserMenu />
                </div>
              </div>
            </header>
            <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
          </div>
        </ClientProviders>
      </body>
    </html>
  )
}
