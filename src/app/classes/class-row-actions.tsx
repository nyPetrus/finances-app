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

  return (
    <div className="flex items-center gap-2">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setError(null);
        }}
      >
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Edit
        </DialogTrigger>
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

      <form
        action={async (formData) => {
          if (window.confirm(`Delete "${classItem.name}"?`)) {
            await deleteClass(formData);
          }
        }}
      >
        <input type="hidden" name="id" value={classItem.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </form>
    </div>
  );
}
