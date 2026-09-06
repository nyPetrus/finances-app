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
import type { Account, Category, Class } from "@/lib/supabase/types";
import { addTransaction } from "./actions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
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

  const classesForCategory = categoryId ? classes.filter((c) => c.category_id === categoryId) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setCategoryId(null);
          setClassId(null);
        }
      }}
    >
      <DialogTrigger render={<Button />}>Add transaction</DialogTrigger>
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
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={todayISO()} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" name="time" type="time" defaultValue={nowTime()} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="-50.00"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Use a negative amount for expenses, positive for income.
          </p>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category_id">Category</Label>
              <Select
                name="category_id"
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setClassId(null);
                }}
              >
                <SelectTrigger id="category_id">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="class_id">Class</Label>
              <Select
                name="class_id"
                value={classId}
                onValueChange={setClassId}
                disabled={!categoryId || classesForCategory.length === 0}
              >
                <SelectTrigger id="class_id">
                  <SelectValue
                    placeholder={
                      !categoryId
                        ? "Pick a category first"
                        : classesForCategory.length === 0
                          ? "No classes"
                          : "None"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {classesForCategory.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
