"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, XCircle } from "lucide-react";
import type { RelevantLink } from "@/types/roadmap";

interface RelevantLinksEditorProps {
  links: RelevantLink[];
  onChange: (links: RelevantLink[]) => void;
  label?: string;
  description?: string;
}

export function RelevantLinksEditor({
  links,
  onChange,
  label = "Relevant Links",
  description = "Add external links for reference.",
}: RelevantLinksEditorProps) {
  const handleUrlChange = (index: number, url: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], url };
    onChange(updated);
  };

  const handleTextChange = (index: number, text: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], text: text || undefined };
    onChange(updated);
  };

  const addLink = () => onChange([...links, { url: "" }]);

  const removeLink = (index: number) =>
    onChange(links.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="url"
              placeholder="Link URL"
              value={link.url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="Link Text"
              value={link.text || ""}
              onChange={(e) => handleTextChange(index, e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLink(index)}
              className="shrink-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
