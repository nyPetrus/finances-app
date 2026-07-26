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
import type { Account, Category, Transaction } from "@/lib/supabase/types";
import { updateTransaction, deleteTransaction } from "./actions";

export function TransactionRowActions({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          <form
            id={`edit-transaction-${transaction.id}`}
            action={async (formData) => {
              await updateTransaction(formData);
              setOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={transaction.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`description-${transaction.id}`}>Description</Label>
              <Input
                id={`description-${transaction.id}`}
                name="description"
                defaultValue={transaction.description}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`date-${transaction.id}`}>Date</Label>
                <Input
                  id={`date-${transaction.id}`}
                  name="date"
                  type="date"
                  defaultValue={transaction.date}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`amount-${transaction.id}`}>Amount</Label>
                <Input
                  id={`amount-${transaction.id}`}
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={transaction.amount}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`account-${transaction.id}`}>Account</Label>
              <Select name="account_id" defaultValue={transaction.account_id}>
                <SelectTrigger id={`account-${transaction.id}`}>
                  <SelectValue />
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
            <div className="flex flex-col gap-2">
              <Label htmlFor={`category-${transaction.id}`}>Category</Label>
              <Select name="category_id" defaultValue={transaction.category_id ?? undefined}>
                <SelectTrigger id={`category-${transaction.id}`}>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" form={`edit-transaction-${transaction.id}`}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <form
        action={async (formData) => {
          if (window.confirm("Delete this transaction?")) {
            await deleteTransaction(formData);
          }
        }}
      >
        <input type="hidden" name="id" value={transaction.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </form>
    </div>
  );
}
