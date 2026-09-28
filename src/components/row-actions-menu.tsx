"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreVerticalIcon,
  PencilIcon,
  RefreshCwIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Rendered in a table's toolbar (not per row) only while exactly one row is
// checked — every handler acts on that `soleSelectedRow`.
export function RowActionsMenu({
  onEdit,
  onSync,
  onImport,
  onToggleActive,
  isActive,
  syncLabel = "Sync",
  disabled,
}: {
  onEdit: () => void;
  onSync?: () => void;
  onImport?: () => void;
  // Deactivate/Activate item, for rows that can be hidden instead of deleted.
  onToggleActive?: () => void;
  isActive?: boolean;
  syncLabel?: string;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Actions for selected row"
            title="Actions"
            disabled={disabled}
          />
        }
      >
        <MoreVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        {onSync && (
          <DropdownMenuItem onClick={onSync}>
            <RefreshCwIcon />
            {syncLabel}
          </DropdownMenuItem>
        )}
        {onImport && (
          <DropdownMenuItem onClick={onImport}>
            <UploadIcon />
            Import
          </DropdownMenuItem>
        )}
        {onToggleActive && (
          <DropdownMenuItem onClick={onToggleActive}>
            {isActive ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
            {isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
