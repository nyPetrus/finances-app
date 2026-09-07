"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Account } from "@/lib/supabase/types";
import { updateAccount, deleteAccount } from "./actions";
import { syncPluggyItem } from "./pluggy-actions";

export function AccountRowActions({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const [isSyncing, startSync] = useTransition();
  const [syncError, setSyncError] = useState<string | null>(null);
  const router = useRouter();

  function handleSync() {
    startSync(async () => {
      setSyncError(null);
      try {
        await syncPluggyItem(account.pluggy_item_id!);
        router.refresh();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : "Failed to sync.");
      }
    });
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${account.name}"? This will also delete all of its transactions.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("id", account.id);
    await deleteAccount(formData);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {account.is_automatic && account.pluggy_item_id && (
              <DropdownMenuItem disabled={isSyncing} onClick={handleSync}>
                {isSyncing ? "Syncing…" : "Sync"}
              </DropdownMenuItem>
            )}
            {!account.is_automatic && (
              <DropdownMenuItem onClick={() => setOpen(true)}>Edit</DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {syncError && <p className="text-xs text-destructive">{syncError}</p>}

      {!account.is_automatic && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit account</DialogTitle>
            </DialogHeader>
            <form
              id={`edit-account-${account.id}`}
              action={async (formData) => {
                await updateAccount(formData);
                setOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="id" value={account.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor={`name-${account.id}`}>Name</Label>
                <Input id={`name-${account.id}`} name="name" defaultValue={account.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`institution-${account.id}`}>Institution</Label>
                <Input
                  id={`institution-${account.id}`}
                  name="institution"
                  defaultValue={account.institution ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`balance-${account.id}`}>Current balance</Label>
                <Input
                  id={`balance-${account.id}`}
                  name="current_balance"
                  type="number"
                  step="0.01"
                  defaultValue={account.current_balance}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" form={`edit-account-${account.id}`}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
