"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The bar above a phone card list (TransactionCardList, Accounts' cards):
 * select-all on the left, and — since cards have no column headers to
 * click — a "Sort: <column>" picker plus a direction toggle on the right.
 * Each caller decides what a sort change does (URL vs. local state).
 */
export function CardListHeader<K extends string>({
  allSelected,
  someSelected,
  onToggleAll,
  selectAllLabel,
  sortOptions,
  sortKey,
  sortDir,
  onSortChange,
}: {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  selectAllLabel: string;
  sortOptions: { key: K; label: string }[];
  sortKey: K;
  sortDir: "asc" | "desc";
  onSortChange: (key: K, dir: "asc" | "desc") => void;
}) {
  const sortLabel = (key: K) => sortOptions.find((option) => option.key === key)?.label ?? key;

  return (
    <div className="flex items-center gap-3 px-3">
      <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={onToggleAll} aria-label={selectAllLabel} />
      <div className="ml-auto flex items-center gap-1">
        <Select value={sortKey} onValueChange={(value) => value && onSortChange(value as K, sortDir)}>
          <SelectTrigger size="sm" aria-label="Sort by" title="Sort by">
            <SelectValue>{(value: K) => `Sort: ${sortLabel(value)}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onSortChange(sortKey, sortDir === "asc" ? "desc" : "asc")}
          aria-label={sortDir === "asc" ? "Sort descending" : "Sort ascending"}
          title={sortDir === "asc" ? "Sort descending" : "Sort ascending"}
        >
          {sortDir === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </Button>
      </div>
    </div>
  );
}
