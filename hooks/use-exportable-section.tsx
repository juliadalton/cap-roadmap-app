"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useExportContent, type ExportableSection } from '@/context/export-content-context'

interface UseExportableSectionOptions {
  pageId: string
  pageName: string
  pagePath: string
  sectionId: string
  sectionName: string
  description?: string
  order: number
}

export function useExportableSection(options: UseExportableSectionOptions) {
  const ref = useRef<HTMLDivElement>(null)
  const { registerPage, registerSection, unregisterSection, updateSectionRef } = useExportContent()

  useEffect(() => {
    registerPage({
      id: options.pageId,
      name: options.pageName,
      path: options.pagePath,
    })

    const section: ExportableSection = {
      id: options.sectionId,
      pageId: options.pageId,
      pageName: options.pageName,
      sectionName: options.sectionName,
      description: options.description,
      order: options.order,
      elementRef: null,
    }
    
    registerSection(section)

    return () => {
      unregisterSection(options.pageId, options.sectionId)
    }
  }, [
    options.pageId,
    options.pageName,
    options.pagePath,
    options.sectionId,
    options.sectionName,
    options.description,
    options.order,
    registerPage,
    registerSection,
    unregisterSection,
  ])

  useEffect(() => {
    updateSectionRef(options.pageId, options.sectionId, ref.current)
  }, [options.pageId, options.sectionId, updateSectionRef])

  return ref
}

interface UseExportablePageOptions {
  pageId: string
  pageName: string
  pagePath: string
}

export function useExportablePage(options: UseExportablePageOptions) {
  const { registerPage, unregisterPage } = useExportContent()

  useEffect(() => {
    registerPage({
      id: options.pageId,
      name: options.pageName,
      path: options.pagePath,
    })

    return () => {
      unregisterPage(options.pageId)
    }
  }, [options.pageId, options.pageName, options.pagePath, registerPage, unregisterPage])
}
