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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addAccount } from "./actions";

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add account</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
        </DialogHeader>
        <form
          id="add-account-form"
          action={async (formData) => {
            await addAccount(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Nubank Checking" required autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="institution">Institution (optional)</Label>
            <Input id="institution" name="institution" placeholder="e.g. Nubank" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="manual">
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="fgts">FGTS</SelectItem>
                <SelectItem value="manual">Manual / Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="current_balance">Current balance</Label>
            <Input
              id="current_balance"
              name="current_balance"
              type="number"
              step="0.01"
              defaultValue="0"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" form="add-account-form">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
