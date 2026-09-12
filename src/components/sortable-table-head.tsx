import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { TableHead } from "@/components/ui/table";

export function SortableTableHead({
  href,
  active,
  dir,
  align = "center",
  children,
}: {
  href: string;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right" | "center";
  children: React.ReactNode;
}) {
  return (
    <TableHead
      className={align === "right" ? "text-right" : align === "center" ? "text-center" : undefined}
    >
      <Link
        href={href}
        className={`flex items-center gap-1 hover:text-foreground ${
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""
        }`}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )
        ) : (
          <ChevronsUpDownIcon className="size-3.5 text-muted-foreground/40" />
        )}
      </Link>
    </TableHead>
  );
}
