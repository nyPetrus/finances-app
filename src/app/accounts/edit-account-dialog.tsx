"use client";

import { useState } from "react";
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
import { updateAccount } from "./actions";

export function EditAccountDialog({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="hover:underline" />}>
        {account.name}
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
            <Label htmlFor={`source-${account.id}`}>Source</Label>
            <Input
              id={`source-${account.id}`}
              name="source"
              defaultValue={account.source ?? ""}
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
  );
}
