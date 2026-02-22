"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface ExportableSection {
  id: string
  pageId: string
  pageName: string
  sectionName: string
  description?: string
  order: number
  elementRef?: HTMLElement | null
  captureFunction?: () => Promise<string | HTMLCanvasElement | null>
}

export interface ExportablePage {
  id: string
  name: string
  path: string
  icon?: ReactNode
  sections: ExportableSection[]
}

interface ExportContentContextType {
  pages: Map<string, ExportablePage>
  registerPage: (page: Omit<ExportablePage, 'sections'>) => void
  unregisterPage: (pageId: string) => void
  registerSection: (section: ExportableSection) => void
  unregisterSection: (pageId: string, sectionId: string) => void
  updateSectionRef: (pageId: string, sectionId: string, ref: HTMLElement | null) => void
  getOrderedPages: () => ExportablePage[]
}

const ExportContentContext = createContext<ExportContentContextType>({
  pages: new Map(),
  registerPage: () => {},
  unregisterPage: () => {},
  registerSection: () => {},
  unregisterSection: () => {},
  updateSectionRef: () => {},
  getOrderedPages: () => [],
})

export const useExportContent = () => useContext(ExportContentContext)

interface ExportContentProviderProps {
  children: ReactNode
}

export function ExportContentProvider({ children }: ExportContentProviderProps) {
  const [pages, setPages] = useState<Map<string, ExportablePage>>(new Map())

  const registerPage = useCallback((page: Omit<ExportablePage, 'sections'>) => {
    setPages(prev => {
      const newPages = new Map(prev)
      const existing = newPages.get(page.id)
      if (existing) {
        newPages.set(page.id, { ...page, sections: existing.sections })
      } else {
        newPages.set(page.id, { ...page, sections: [] })
      }
      return newPages
    })
  }, [])

  const unregisterPage = useCallback((pageId: string) => {
    setPages(prev => {
      const newPages = new Map(prev)
      newPages.delete(pageId)
      return newPages
    })
  }, [])

  const registerSection = useCallback((section: ExportableSection) => {
    setPages(prev => {
      const newPages = new Map(prev)
      let page = newPages.get(section.pageId)
      
      if (!page) {
        page = {
          id: section.pageId,
          name: section.pageName,
          path: `/${section.pageId}`,
          sections: [],
        }
        newPages.set(section.pageId, page)
      }
      
      const existingIndex = page.sections.findIndex(s => s.id === section.id)
      if (existingIndex >= 0) {
        page.sections[existingIndex] = section
      } else {
        page.sections.push(section)
        page.sections.sort((a, b) => a.order - b.order)
      }
      newPages.set(section.pageId, { ...page })
      
      return newPages
    })
  }, [])

  const unregisterSection = useCallback((pageId: string, sectionId: string) => {
    setPages(prev => {
      const newPages = new Map(prev)
      const page = newPages.get(pageId)
      if (page) {
        page.sections = page.sections.filter(s => s.id !== sectionId)
        newPages.set(pageId, { ...page })
      }
      return newPages
    })
  }, [])

  const updateSectionRef = useCallback((pageId: string, sectionId: string, ref: HTMLElement | null) => {
    setPages(prev => {
      const newPages = new Map(prev)
      const page = newPages.get(pageId)
      if (page) {
        const section = page.sections.find(s => s.id === sectionId)
        if (section) {
          section.elementRef = ref
          newPages.set(pageId, { ...page })
        }
      }
      return newPages
    })
  }, [])

  const getOrderedPages = useCallback(() => {
    return Array.from(pages.values()).sort((a, b) => {
      const pageOrder = ['roadmap', 'category', 'timeline', 'roadmap-process', 'acquisitions', 'acquisition-tracker', 'technical-integration']
      const aIndex = pageOrder.indexOf(a.id)
      const bIndex = pageOrder.indexOf(b.id)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
  }, [pages])

  const value = {
    pages,
    registerPage,
    unregisterPage,
    registerSection,
    unregisterSection,
    updateSectionRef,
    getOrderedPages,
  }

  return (
    <ExportContentContext.Provider value={value}>
      {children}
    </ExportContentContext.Provider>
  )
}
