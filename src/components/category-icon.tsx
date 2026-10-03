import { CATEGORY_ICON_MAP, DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICON_MAP[icon] ?? CATEGORY_ICON_MAP[DEFAULT_CATEGORY_ICON];
  return <Icon className={className} />;
}

// Pickers show a category's or class's icon + name, like AutonomyOptionLabel.
export function CategoryOptionLabel({ icon, name }: { icon: string; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <CategoryIcon icon={icon} className="size-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}
