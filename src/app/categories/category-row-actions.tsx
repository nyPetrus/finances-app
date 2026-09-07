"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorSwatchPicker } from "@/components/color-swatch-picker";
import type { Category } from "@/lib/supabase/types";
import { updateCategory, deleteCategory } from "./actions";

export function CategoryRowActions({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(category.color);

  function openEditDialog() {
    setError(null);
    setColor(category.color);
    setOpen(true);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${category.name}"? Transactions in this category will become uncategorized.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("id", category.id);
    await deleteCategory(formData);
  }

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={openEditDialog}>Edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <form
            id={`edit-category-${category.id}`}
            action={async (formData) => {
              try {
                await updateCategory(formData);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update category.");
              }
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={category.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`name-${category.id}`}>Name</Label>
              <Input id={`name-${category.id}`} name="name" defaultValue={category.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`kind-${category.id}`}>Type</Label>
              <Select name="kind" defaultValue={category.kind}>
                <SelectTrigger id={`kind-${category.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <ColorSwatchPicker name="color" value={color} onChange={setColor} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" form={`edit-category-${category.id}`}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
