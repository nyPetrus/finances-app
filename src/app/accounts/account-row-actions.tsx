"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Account } from "@/lib/supabase/types";
import { updateAccount, deleteAccount } from "./actions";
import { syncPluggyItem } from "./pluggy-actions";

export function AccountRowActions({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const [isSyncing, startSync] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {account.is_automatic && account.pluggy_item_id && (
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={() =>
            startSync(async () => {
              await syncPluggyItem(account.pluggy_item_id!);
              router.refresh();
            })
          }
        >
          {isSyncing ? "Syncing…" : "Sync"}
        </Button>
      )}

      {!account.is_automatic && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Edit
          </DialogTrigger>
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

      <form
        action={async (formData) => {
          if (
            window.confirm(
              `Delete "${account.name}"? This will also delete all of its transactions.`
            )
          ) {
            await deleteAccount(formData);
          }
        }}
      >
        <input type="hidden" name="id" value={account.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </form>
    </div>
  );
}
