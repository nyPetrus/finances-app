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
import type { Category, Class } from "@/lib/supabase/types";
import { updateClass, deleteClass } from "./actions";

export function ClassRowActions({
  classItem,
  categories,
}: {
  classItem: Class;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditDialog() {
    setError(null);
    setOpen(true);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${classItem.name}"?`)) return;
    const formData = new FormData();
    formData.set("id", classItem.id);
    await deleteClass(formData);
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
            <DialogTitle>Edit class</DialogTitle>
          </DialogHeader>
          <form
            id={`edit-class-${classItem.id}`}
            action={async (formData) => {
              try {
                await updateClass(formData);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update class.");
              }
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={classItem.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`name-${classItem.id}`}>Name</Label>
              <Input id={`name-${classItem.id}`} name="name" defaultValue={classItem.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`category-${classItem.id}`}>Category</Label>
              <Select name="category_id" defaultValue={classItem.category_id}>
                <SelectTrigger id={`category-${classItem.id}`}>
                  <SelectValue />
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" form={`edit-class-${classItem.id}`}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
