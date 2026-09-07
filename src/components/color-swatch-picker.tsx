"use client";

import { CATEGORY_COLORS } from "@/lib/category-colors";
import { cn } from "@/lib/utils";

export function ColorSwatchPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const colors = CATEGORY_COLORS.includes(value) ? CATEGORY_COLORS : [...CATEGORY_COLORS, value];

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={color}
          aria-pressed={value === color}
          className={cn(
            "h-7 w-7 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform",
            value === color ? "scale-110 ring-foreground" : "ring-transparent hover:ring-muted-foreground/30",
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
