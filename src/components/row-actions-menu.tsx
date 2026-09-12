"use client";

import { MoreVerticalIcon, PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RowActionsMenu({
  onEdit,
  onDelete,
  onSync,
  syncLabel = "Sync",
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onSync?: () => void;
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
            aria-label="Row actions"
            title="Row actions"
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
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
