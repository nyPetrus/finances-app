"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ListPlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The single home for every action on the selected rows (per explicit user
// request: no toolbar button may duplicate one of these, and Delete /
// Deactivate live only here). Rendered in a table's toolbar whenever one or
// more rows are checked; each table passes only the handlers that apply to
// the current selection (e.g. `onEdit` only for a single row, `onDeactivate`
// only if some selected row is active), and an omitted handler hides its
// item. Delete sits last, below a separator, styled destructive — the
// caller still confirms before deleting.
export function RowActionsMenu({
  onEdit,
  extraActions = [],
  onCreateRule,
  onImport,
  onDeactivate,
  onActivate,
  onDelete,
  disabled,
}: {
  onEdit?: () => void;
  // Page-specific items listed right after Edit (e.g. Categories & Classes'
  // "Add class" / "Remove from category").
  extraActions?: { label: string; icon: LucideIcon; onClick: () => void }[];
  // Transactions only: save this row's category/class as a description rule.
  onCreateRule?: () => void;
  onImport?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Actions for selected rows"
            title="Actions"
            disabled={disabled}
          />
        }
      >
        <MoreVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
        )}
        {extraActions.map(({ label, icon: Icon, onClick }) => (
          <DropdownMenuItem key={label} onClick={onClick}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
        {onCreateRule && (
          <DropdownMenuItem onClick={onCreateRule}>
            <ListPlusIcon />
            Create rule
          </DropdownMenuItem>
        )}
        {onImport && (
          <DropdownMenuItem onClick={onImport}>
            <UploadIcon />
            Import
          </DropdownMenuItem>
        )}
        {onDeactivate && (
          <DropdownMenuItem onClick={onDeactivate}>
            <ArchiveIcon />
            Deactivate
          </DropdownMenuItem>
        )}
        {onActivate && (
          <DropdownMenuItem onClick={onActivate}>
            <ArchiveRestoreIcon />
            Activate
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            {(onEdit || extraActions.length > 0 || onCreateRule || onImport || onDeactivate || onActivate) && <DropdownMenuSeparator />}
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
