"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Loader2, ArrowRight } from "lucide-react"

const APPS = [
  {
    id: "roadmap",
    href: "/roadmap",
    external: false,
    label: "Product Roadmap",
    description:
      "View the product roadmap, track acquisition integration progress, and explore upcoming milestones across all company initiatives.",
    cta: "Go to Roadmap",
    accent: "from-[#02214D] to-[#0a3a7a]",
    iconBg: "bg-[#02214D]",
  },
  {
    id: "prp",
    href: "https://prp-machine.vercel.app",
    external: true,
    label: "PRP Machine",
    description:
      "Review product requests and issues across platforms, evaluate impact of feedback and requests, review client usage, and the triage of items pre-roadmap or sprint inclusion.",
    cta: "Go to PRP Machine",
    accent: "from-[#1a1a2e] to-[#16213e]",
    iconBg: "bg-[#1a1a2e]",
  },
]

export default function HubPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-background flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-12 max-w-xl">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose where you'd like to go.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {APPS.map((app) => (
            <a
              key={app.id}
              href={app.href}
              target={app.external ? "_blank" : undefined}
              rel={app.external ? "noopener noreferrer" : undefined}
              className="group relative flex flex-col rounded-2xl border bg-card shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden hover:-translate-y-0.5"
            >
              {/* Gradient accent bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${app.accent}`} />

              <div className="flex flex-col flex-1 p-6 gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{app.label}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="mt-auto pt-2 flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all duration-150">
                  {app.cta}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Capacity. All rights reserved.
      </footer>
    </div>
  )
}
