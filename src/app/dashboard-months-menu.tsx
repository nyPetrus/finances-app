"use client";

import { CalendarDaysIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MONTH_LABELS } from "./dashboard-monthly-table";

/**
 * Icon-button dropdown for choosing which month columns the dynamic table
 * shows. Like ColumnsMenu but without reordering — months stay in calendar
 * order. Hiding a month never changes the Year column (always the full year).
 */
export function MonthsMenu({
  hidden,
  onToggle,
  onSetAll,
}: {
  hidden: Set<number>;
  onToggle: (month: number) => void;
  onSetAll: (visible: boolean) => void;
}) {
  const allVisible = hidden.size === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="Months" title="Months" />}
      >
        <CalendarDaysIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <div className="flex items-center gap-1.5 rounded-md border-b px-1.5 py-1.5">
          <Checkbox
            checked={allVisible}
            indeterminate={!allVisible && hidden.size < 12}
            onCheckedChange={() => onSetAll(!allVisible)}
            aria-label="Show all months"
          />
          <span className="flex-1 text-sm font-medium">All months</span>
        </div>
        {MONTH_LABELS.map((label, month) => (
          <div key={label} className="flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <Checkbox
              checked={!hidden.has(month)}
              onCheckedChange={() => onToggle(month)}
              aria-label={`Show ${label} column`}
            />
            <span className="flex-1 text-sm capitalize">{label}</span>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
