import { CATEGORY_ICON_MAP, DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICON_MAP[icon] ?? CATEGORY_ICON_MAP[DEFAULT_CATEGORY_ICON];
  return <Icon className={className} />;
}
