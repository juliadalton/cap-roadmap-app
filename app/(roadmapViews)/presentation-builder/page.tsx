"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRoadmap } from "../layout";
import { useExportContent, type ExportablePage, type ExportableSection } from "@/context/export-content-context";
import { Lock, FileDown, Presentation, FileText, GripVertical, Check, ChevronDown, ChevronRight, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SelectedContent {
  pageId: string;
  sectionIds: string[];
  includeAllSections: boolean;
}

export default function PresentationBuilderPage() {
  const { isEditor, setHeaderActions } = useRoadmap();
  const { getOrderedPages, pages } = useExportContent();
  
  const [presentationTitle, setPresentationTitle] = useState("Roadmap Presentation");
  const [selectedContent, setSelectedContent] = useState<Map<string, SelectedContent>>(new Map());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'pptx' | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; currentSection: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [registeredPages, setRegisteredPages] = useState<ExportablePage[]>([]);

  useEffect(() => {
    setHeaderActions(null);
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  useEffect(() => {
    const orderedPages = getOrderedPages();
    setRegisteredPages(orderedPages);
  }, [getOrderedPages, pages]);

  const togglePageSelection = useCallback((pageId: string) => {
    setSelectedContent(prev => {
      const newMap = new Map(prev);
      if (newMap.has(pageId)) {
        newMap.delete(pageId);
      } else {
        const page = registeredPages.find(p => p.id === pageId);
        if (page) {
          newMap.set(pageId, {
            pageId,
            sectionIds: page.sections.map(s => s.id),
            includeAllSections: true,
          });
        }
      }
      return newMap;
    });
  }, [registeredPages]);

  const toggleSectionSelection = useCallback((pageId: string, sectionId: string) => {
    setSelectedContent(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(pageId);
      
      if (existing) {
        const newSectionIds = existing.sectionIds.includes(sectionId)
          ? existing.sectionIds.filter(id => id !== sectionId)
          : [...existing.sectionIds, sectionId];
        
        if (newSectionIds.length === 0) {
          newMap.delete(pageId);
        } else {
          const page = registeredPages.find(p => p.id === pageId);
          newMap.set(pageId, {
            ...existing,
            sectionIds: newSectionIds,
            includeAllSections: page ? newSectionIds.length === page.sections.length : false,
          });
        }
      } else {
        newMap.set(pageId, {
          pageId,
          sectionIds: [sectionId],
          includeAllSections: false,
        });
      }
      return newMap;
    });
  }, [registeredPages]);

  const togglePageExpanded = useCallback((pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  }, []);

  const selectAllPages = useCallback(() => {
    const newMap = new Map<string, SelectedContent>();
    registeredPages.forEach(page => {
      newMap.set(page.id, {
        pageId: page.id,
        sectionIds: page.sections.map(s => s.id),
        includeAllSections: true,
      });
    });
    setSelectedContent(newMap);
  }, [registeredPages]);

  const clearSelection = useCallback(() => {
    setSelectedContent(new Map());
  }, []);

  const getSelectedCount = useCallback(() => {
    let sectionCount = 0;
    selectedContent.forEach(content => {
      sectionCount += content.sectionIds.length;
    });
    return { pageCount: selectedContent.size, sectionCount };
  }, [selectedContent]);

  const handleExport = useCallback(async (format: 'pdf' | 'pptx') => {
    setIsExporting(true);
    setExportFormat(format);
    
    try {
      if (format === 'pdf') {
        await exportToPDF();
      } else {
        alert('PowerPoint export requires server-side processing. This feature is coming soon.');
      }
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
      alert(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  }, [selectedContent, presentationTitle, registeredPages]);

  const capturePageViaIframe = async (
    pagePath: string, 
    sectionId: string,
    html2canvas: typeof import('html2canvas').default
  ): Promise<HTMLCanvasElement | null> => {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '1400px';
      iframe.style.height = '2000px';
      iframe.style.border = 'none';
      iframe.src = `${pagePath}?export=true`;
      
      const timeout = setTimeout(() => {
        console.warn(`Timeout capturing ${sectionId} from ${pagePath}`);
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        resolve(null);
      }, 20000);

      iframe.onload = async () => {
        try {
          await new Promise(r => setTimeout(r, 3000));
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            throw new Error('Cannot access iframe document');
          }

          const targetElement = iframeDoc.querySelector(`[data-export-section="${sectionId}"]`) as HTMLElement;

          if (!targetElement) {
            console.error(`Could not find element with data-export-section="${sectionId}" in ${pagePath}`);
            console.log('Available export sections:', 
              Array.from(iframeDoc.querySelectorAll('[data-export-section]'))
                .map(el => el.getAttribute('data-export-section'))
            );
            throw new Error(`Could not find element for section ${sectionId}`);
          }

          console.log(`Found element for ${sectionId}:`, targetElement.tagName, targetElement.className);

          const canvas = await html2canvas(targetElement, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1400,
            windowHeight: 2000,
            scrollY: -window.scrollY,
            scrollX: 0,
          });

          clearTimeout(timeout);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          resolve(canvas);
        } catch (err) {
          console.error(`Error capturing ${sectionId}:`, err);
          clearTimeout(timeout);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          resolve(null);
        }
      };

      document.body.appendChild(iframe);
    });
  };

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080],
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const HEADER_HEIGHT = 80;
    const PADDING = 40;

    pdf.setFillColor(2, 33, 77);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(72);
    pdf.text(presentationTitle, pageWidth / 2, pageHeight / 2 - 40, { align: 'center' });
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.setFontSize(28);
    pdf.text(dateStr, pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });

    let capturedAny = true;
    
    const totalSections = Array.from(selectedContent.values()).reduce(
      (sum, content) => sum + content.sectionIds.length, 0
    );
    let currentSection = 0;

    for (const [pageId, content] of selectedContent) {
      const page = registeredPages.find(p => p.id === pageId);
      if (!page) continue;

      for (const sectionId of content.sectionIds) {
        const section = page.sections.find(s => s.id === sectionId);
        if (!section) continue;

        currentSection++;
        setExportProgress({
          current: currentSection,
          total: totalSections,
          currentSection: `${page.name} - ${section.sectionName}`,
        });

        pdf.addPage();

        pdf.setFillColor(2, 33, 77);
        pdf.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(32);
        pdf.text(section.sectionName, PADDING, HEADER_HEIGHT / 2 + 12);
        
        pdf.setFontSize(18);
        pdf.setTextColor(200, 200, 200);
        pdf.text(page.name, pageWidth - PADDING, HEADER_HEIGHT / 2 + 8, { align: 'right' });

        try {
          const canvas = await capturePageViaIframe(page.path, sectionId, html2canvas);
          
          if (!canvas) {
            console.warn(`Skipping section ${sectionId} - could not capture`);
            pdf.setTextColor(150, 150, 150);
            pdf.setFontSize(24);
            pdf.text('Content could not be captured', pageWidth / 2, pageHeight / 2, { align: 'center' });
            continue;
          }

          const imgData = canvas.toDataURL('image/png');
          
          const contentAreaHeight = pageHeight - HEADER_HEIGHT - PADDING * 2;
          const contentAreaWidth = pageWidth - PADDING * 2;
          
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = Math.min(contentAreaWidth / imgWidth, contentAreaHeight / imgHeight);
          
          const scaledWidth = imgWidth * ratio;
          const scaledHeight = imgHeight * ratio;
          const x = (pageWidth - scaledWidth) / 2;
          const y = HEADER_HEIGHT + PADDING + (contentAreaHeight - scaledHeight) / 2;

          pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
        } catch (err) {
          console.error(`Failed to capture section ${sectionId}:`, err);
          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(24);
          pdf.text('Error capturing content', pageWidth / 2, pageHeight / 2, { align: 'center' });
        }
      }
    }
    
    setExportProgress(null);

    if (!capturedAny) {
      alert('Could not capture any content. This may be due to cross-origin restrictions. Please try exporting from individual pages.');
      return;
    }

    pdf.save(`${presentationTitle.replace(/\s+/g, '_')}.pdf`);
  };

  if (!isEditor) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <div className="text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">Presentation Builder Restricted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You need editor permissions to access this feature.
          </p>
        </div>
      </div>
    );
  }

  const { pageCount, sectionCount } = getSelectedCount();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Presentation Builder
          </CardTitle>
          <CardDescription>
            Select pages and sections to include in your presentation, then export to PDF or PowerPoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="presentation-title">Presentation Title</Label>
                <Input
                  id="presentation-title"
                  value={presentationTitle}
                  onChange={(e) => setPresentationTitle(e.target.value)}
                  placeholder="Enter presentation title..."
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={selectAllPages}>
                  <Check className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            {selectedContent.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{pageCount} page{pageCount !== 1 ? 's' : ''}</Badge>
                <Badge variant="secondary">{sectionCount} section{sectionCount !== 1 ? 's' : ''}</Badge>
                selected
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Content</CardTitle>
              <CardDescription>
                {registeredPages.length === 0 
                  ? "No pages have registered exportable content yet. Visit pages to register their content."
                  : "Select pages and sections to include in your presentation."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {registeredPages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">
                      No exportable content registered.<br />
                      <span className="text-sm">Visit pages to make their content available for export.</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registeredPages.map((page) => {
                      const isSelected = selectedContent.has(page.id);
                      const selectedSections = selectedContent.get(page.id)?.sectionIds || [];
                      const isExpanded = expandedPages.has(page.id);
                      
                      return (
                        <div key={page.id} className="border rounded-lg overflow-hidden">
                          <div 
                            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePageSelection(page.id)}
                            />
                            <button 
                              onClick={() => togglePageExpanded(page.id)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium">{page.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                              </Badge>
                            </button>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedSections.length}/{page.sections.length}
                              </Badge>
                            )}
                          </div>
                          
                          {isExpanded && page.sections.length > 0 && (
                            <div className="border-t bg-muted/20 p-3 pl-12 space-y-2">
                              {page.sections.map((section) => (
                                <div 
                                  key={section.id}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={selectedSections.includes(section.id)}
                                    onCheckedChange={() => toggleSectionSelection(page.id, section.id)}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">{section.sectionName}</span>
                                    {section.description && (
                                      <p className="text-xs text-muted-foreground">{section.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="pdf" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pdf">PDF</TabsTrigger>
                  <TabsTrigger value="pptx">PowerPoint</TabsTrigger>
                </TabsList>
                <TabsContent value="pdf" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Export selected content as a PDF document. Each section becomes a page in the PDF.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Export loads each page in the background to capture content. This may take a moment.
                  </p>
                  {exportProgress && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span>Capturing pages...</span>
                        <span className="font-medium">{exportProgress.current}/{exportProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {exportProgress.currentSection}
                      </p>
                    </div>
                  )}
                  <Button 
                    className="w-full" 
                    onClick={() => handleExport('pdf')}
                    disabled={selectedContent.size === 0 || isExporting}
                  >
                    {isExporting && exportFormat === 'pdf' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {exportProgress ? 'Capturing...' : 'Generating PDF...'}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export as PDF
                      </>
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="pptx" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Export selected content as a PowerPoint presentation. Each section becomes a slide.
                  </p>
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                    <p className="text-sm text-center text-muted-foreground">
                      <Presentation className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      PowerPoint export coming soon.<br />
                      <span className="text-xs">Use PDF export for now.</span>
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {selectedContent.size === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Select at least one page or section to enable export.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
