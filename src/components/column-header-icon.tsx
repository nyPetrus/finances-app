import type { LucideIcon } from "lucide-react";

export function ColumnHeaderIcon({
  icon: Icon,
  label,
  iconOnly = false,
}: {
  icon: LucideIcon;
  label: string;
  iconOnly?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" title={iconOnly ? label : undefined}>
      <Icon className="size-4 shrink-0" />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
