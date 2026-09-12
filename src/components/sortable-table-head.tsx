import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { TableHead } from "@/components/ui/table";

type SortableTableHeadProps = {
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right" | "center";
  children: React.ReactNode;
} & ({ href: string; onSort?: never } | { href?: never; onSort: () => void });

export function SortableTableHead({
  href,
  onSort,
  active,
  dir,
  align = "center",
  children,
}: SortableTableHeadProps) {
  const content = (
    <>
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
    </>
  );
  const innerClassName = `flex items-center gap-1 hover:text-foreground ${
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""
  }`;

  return (
    <TableHead
      className={align === "right" ? "text-right" : align === "center" ? "text-center" : undefined}
    >
      {onSort ? (
        <button type="button" onClick={onSort} className={`w-full ${innerClassName}`}>
          {content}
        </button>
      ) : (
        <Link href={href} className={innerClassName}>
          {content}
        </Link>
      )}
    </TableHead>
  );
}
