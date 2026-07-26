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
import type { Category } from "@/lib/supabase/types";
import { updateCategory, deleteCategory } from "./actions";

export function CategoryRowActions({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <form
            id={`edit-category-${category.id}`}
            action={async (formData) => {
              await updateCategory(formData);
              setOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={category.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`name-${category.id}`}>Name</Label>
              <Input id={`name-${category.id}`} name="name" defaultValue={category.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`color-${category.id}`}>Color</Label>
              <Input
                id={`color-${category.id}`}
                name="color"
                type="color"
                defaultValue={category.color}
                className="h-10 w-16 p-1"
              />
            </div>
            <DialogFooter>
              <Button type="submit" form={`edit-category-${category.id}`}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <form
        action={async (formData) => {
          if (window.confirm(`Delete "${category.name}"? Transactions in this category will become uncategorized.`)) {
            await deleteCategory(formData);
          }
        }}
      >
        <input type="hidden" name="id" value={category.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </form>
    </div>
  );
}
