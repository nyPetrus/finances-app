import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { TableHead } from "@/components/ui/table";

export function SortableTableHead({
  href,
  active,
  dir,
  align = "left",
  children,
}: {
  href: string;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <Link
        href={href}
        className={`flex items-center gap-1 hover:text-foreground ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {children}
        {active &&
          (dir === "asc" ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          ))}
      </Link>
    </TableHead>
  );
}
