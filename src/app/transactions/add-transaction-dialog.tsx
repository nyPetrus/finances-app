"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
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
import { ClassificationFields } from "@/components/classification-fields";
import { AmountInput, DateInput } from "@/components/locale-inputs";
import type { Account, Category, Class, Autonomy } from "@/lib/supabase/types";
import { addTransaction } from "./actions";

// Local date, not UTC — toISOString() rolls over to tomorrow in the evening in Brazil.
function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

export function AddTransactionDialog({
  accounts,
  categories,
  classes,
}: {
  accounts: Account[];
  categories: Category[];
  classes: Class[];
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [autonomy, setAutonomy] = useState<Autonomy | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setCategoryId(null);
          setClassId(null);
          setAutonomy(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Add transaction" title="Add transaction" />}>
        <PlusIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
        </DialogHeader>
        <form
          id="add-transaction-form"
          action={async (formData) => {
            await addTransaction(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <DateInput id="date" name="date" defaultValue={todayISO()} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount</Label>
              <AmountInput id="amount" name="amount" placeholder="-50,00" required />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="account_id">Account</Label>
            <Select name="account_id" required>
              <SelectTrigger id="account_id">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ClassificationFields
            categories={categories}
            classes={classes}
            categoryId={categoryId}
            classId={classId}
            onCategoryChange={setCategoryId}
            onClassChange={setClassId}
            autonomy={autonomy}
            onAutonomyChange={setAutonomy}
          />
          <DialogFooter>
            <Button type="submit" form="add-transaction-form">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
