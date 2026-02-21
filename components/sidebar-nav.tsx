"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Menu,
  X,
  LayoutDashboard,
  Building2,
  FileEdit,
  ChevronRight,
} from "lucide-react";

// Navigation section with links
interface NavLink {
  href: string;
  label: string;
}

interface NavSection {
  title: string;
  icon: React.ReactNode;
  links: NavLink[];
}

interface SidebarNavProps {
  isEditor: boolean;
  onNavigate?: () => void; // Called when a nav link is clicked
  isExpanded: boolean;
  onToggle: () => void;
}

export default function SidebarNav({ isEditor, onNavigate, isExpanded, onToggle }: SidebarNavProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768 && isExpanded) {
        onToggle(); // Collapse on mobile
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Define navigation sections
  const navSections: NavSection[] = [
    {
      title: "Roadmap Views",
      icon: <LayoutDashboard className="h-4 w-4" />,
      links: [
        { href: "/roadmap", label: "Standard View" },
        { href: "/category", label: "By Category" },
        { href: "/timeline", label: "Vertical Timeline" },
      ],
    },
    {
      title: "Company Integrations",
      icon: <Building2 className="h-4 w-4" />,
      links: [
        { href: "/acquisitions", label: "Acquisition List" },
        { href: "/acquisition-tracker", label: "Acquisition Tracker" },
        { href: "/technical-integration", label: "Technical Integration" },
      ],
    },
    // Admin section only for editors
    ...(isEditor
      ? [
          {
            title: "Admin",
            icon: <FileEdit className="h-4 w-4" />,
            links: [
              { href: "/editor", label: "Item Editor" },
              { href: "/milestone-editor", label: "Milestone Editor" },
            ],
          },
        ]
      : []),
  ];

  const toggleSidebar = () => {
    onToggle();
  };

  const handleNavClick = () => {
    // On mobile, collapse sidebar after navigation
    if (isMobile && isExpanded) {
      onToggle();
    }
    onNavigate?.();
  };

  return (
    <>
      {/* Mobile overlay when sidebar is expanded */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => onToggle()}
        />
      )}

      {/* Sidebar - fixed position below header */}
      <aside
        className={cn(
          "fixed top-[57px] left-0 h-[calc(100vh-57px)] bg-background border-r transition-all duration-300 ease-in-out flex flex-col z-40",
          isExpanded ? "w-64" : "w-16"
        )}
      >
        {/* Header with toggle button */}
        <div className={cn(
          "flex items-center h-14 border-b shrink-0 bg-[#f0f4f9] dark:bg-background",
          isExpanded ? "justify-between px-4" : "justify-center"
        )}>
          {isExpanded && (
            <span className="font-semibold text-lg truncate">Roadmap App</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="shrink-0"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-6 px-2">
            {navSections.map((section) => (
              <div key={section.title}>
                {/* Section Header with Icon */}
                {isExpanded ? (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-[#567095] dark:text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="shrink-0">{section.icon}</span>
                    {section.title}
                  </h3>
                ) : (
                  // When collapsed, show just the section icon with tooltip
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-center mb-2 py-1 text-[#567095] dark:text-muted-foreground">
                          {section.icon}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {section.title}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Section Links */}
                <ul className="space-y-1">
                  {section.links.map((link) => {
                    const isActive = pathname === link.href;
                    
                    const linkContent = (
                      <Link
                        href={link.href}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-[rgb(2_33_77)] text-white dark:bg-primary dark:text-primary-foreground"
                            : "text-[rgb(2_33_77)] dark:text-muted-foreground hover:bg-muted hover:text-foreground",
                          !isExpanded && "justify-center px-2 text-xs"
                        )}
                      >
                        <span className="truncate">{isExpanded ? link.label : link.label.charAt(0)}</span>
                        {isExpanded && isActive && (
                          <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                        )}
                      </Link>
                    );

                    // Wrap in tooltip when collapsed
                    if (!isExpanded) {
                      return (
                        <li key={link.href}>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                              <TooltipContent side="right" className="font-medium">
                                {link.label}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </li>
                      );
                    }

                    return <li key={link.href}>{linkContent}</li>;
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
