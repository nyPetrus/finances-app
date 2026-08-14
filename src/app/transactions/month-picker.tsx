"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTH_ABBREVIATIONS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function MonthPicker({ selectedMonth }: { selectedMonth: string }) {
  const [open, setOpen] = useState(false);
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const [displayYear, setDisplayYear] = useState(selectedYear);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDisplayYear(selectedYear);
      }}
    >
      <PopoverTrigger render={<Button variant="outline" size="icon-sm" />}>
        <CalendarIcon />
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => setDisplayYear((y) => y - 1)}>
            <ChevronLeftIcon />
          </Button>
          <span className="text-sm font-medium">{displayYear}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setDisplayYear((y) => y + 1)}>
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-2">
          {MONTH_ABBREVIATIONS.map((label, i) => {
            const monthKey = `${displayYear}-${String(i + 1).padStart(2, "0")}`;
            const isSelected = monthKey === selectedMonth;
            return (
              <Button
                key={monthKey}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                render={<Link href={`/transactions?month=${monthKey}`} />}
                onClick={() => setOpen(false)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
