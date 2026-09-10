"use client";

import { CATEGORY_ICON_MAP, CATEGORY_ICONS } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export function IconSwatchPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (icon: string) => void;
}) {
  const icons = CATEGORY_ICONS.includes(value) ? CATEGORY_ICONS : [...CATEGORY_ICONS, value];

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {icons.map((icon) => {
        const Icon = CATEGORY_ICON_MAP[icon];
        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            aria-label={icon}
            aria-pressed={value === icon}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
              value === icon
                ? "border-foreground bg-muted"
                : "border-input hover:bg-muted/50",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
