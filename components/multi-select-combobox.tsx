"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, XCircle } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  searchValue?: string;
  sublabel?: string;
}

interface MultiSelectComboboxProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  description?: string;
  allowIndividualRemove?: boolean;
}

export function MultiSelectCombobox({
  label,
  options,
  selected,
  onToggle,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  description,
  allowIndividualRemove = false,
}: MultiSelectComboboxProps) {
  const selectedOptions = selected
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-auto min-h-[40px]"
          >
            <div className="flex flex-wrap gap-1">
              {selectedOptions.length > 0 ? (
                selectedOptions.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant="secondary"
                    className={
                      allowIndividualRemove
                        ? "flex items-center gap-1 pr-1"
                        : undefined
                    }
                  >
                    {opt.label}
                    {allowIndividualRemove && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(opt.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            onToggle(opt.value);
                          }
                        }}
                      >
                        <XCircle className="h-3 w-3" />
                      </span>
                    )}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.searchValue ?? option.label}
                    onSelect={() => onToggle(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                    {option.sublabel && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({option.sublabel})
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
