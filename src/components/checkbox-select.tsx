"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * A button that opens a checkbox list for picking any number of values
 * (OR semantics — matches any checked option), instead of a single-value
 * Select. Options render as plain divs (not DropdownMenuCheckboxItem) so
 * clicking a checkbox doesn't close the menu — same trick ColumnsMenu uses.
 */
export function CheckboxSelect({
  options,
  selected,
  onToggle,
  placeholder,
  className,
}: {
  options: { value: string; label: string }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const summary =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? (options.find((option) => selected.has(option.value))?.label ?? placeholder)
        : `${selected.size} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className={cn("w-56 justify-between font-normal", className)} />}
      >
        <span className="truncate">{summary}</span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-56 overflow-auto">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2 rounded-md px-1.5 py-1">
            <Checkbox
              checked={selected.has(option.value)}
              onCheckedChange={() => onToggle(option.value)}
              aria-label={option.label}
            />
            <span className="flex-1 truncate text-sm">{option.label}</span>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
