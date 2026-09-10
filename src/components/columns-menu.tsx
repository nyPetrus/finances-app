"use client";

import { ChevronDownIcon, ChevronUpIcon, Columns3Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * Icon-button dropdown for toggling column visibility and reordering
 * columns (up/down arrows), backed by `useColumnPreferences`.
 */
export function ColumnsMenu<K extends string>({
  columns,
  order,
  hidden,
  onToggle,
  onMove,
}: {
  columns: { key: K; label: string }[];
  order: K[];
  hidden: Set<K>;
  onToggle: (key: K) => void;
  onMove: (key: K, direction: -1 | 1) => void;
}) {
  const columnsByKey = new Map(columns.map((column) => [column.key, column]));
  const orderedColumns = order.map((key) => columnsByKey.get(key)).filter((column) => column != null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" />}>
        <Columns3Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {orderedColumns.map((column, index) => (
          <div key={column.key} className="flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <Checkbox
              checked={!hidden.has(column.key)}
              onCheckedChange={() => onToggle(column.key)}
              aria-label={`Show ${column.label} column`}
            />
            <span className="flex-1 text-sm">{column.label}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={index === 0}
              onClick={() => onMove(column.key, -1)}
              aria-label={`Move ${column.label} column earlier`}
            >
              <ChevronUpIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={index === orderedColumns.length - 1}
              onClick={() => onMove(column.key, 1)}
              aria-label={`Move ${column.label} column later`}
            >
              <ChevronDownIcon />
            </Button>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
