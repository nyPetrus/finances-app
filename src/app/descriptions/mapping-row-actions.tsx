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
import type { Category, Class, MappedDescription } from "@/lib/supabase/types";
import { updateMappedDescription, deleteMappedDescription } from "./actions";

export function MappingRowActions({
  mapping,
  categories,
  classes,
}: {
  mapping: MappedDescription;
  categories: Category[];
  classes: Class[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(mapping.category_id);
  const [classId, setClassId] = useState<string | null>(mapping.class_id);

  const classesForCategory = categoryId ? classes.filter((c) => c.category_id === categoryId) : [];

  function openEditDialog() {
    setError(null);
    setCategoryId(mapping.category_id);
    setClassId(mapping.class_id);
    setOpen(true);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete mapping for "${mapping.description}"?`)) return;
    const formData = new FormData();
    formData.set("description", mapping.description);
    await deleteMappedDescription(formData);
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
            <DialogTitle>Edit mapping</DialogTitle>
          </DialogHeader>
          <form
            id={`edit-mapping-${mapping.description}`}
            action={async (formData) => {
              try {
                await updateMappedDescription(formData);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update mapping.");
              }
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="original_description" value={mapping.description} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`description-${mapping.description}`}>Description</Label>
              <Input
                id={`description-${mapping.description}`}
                name="description"
                defaultValue={mapping.description}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`category-${mapping.description}`}>Category</Label>
              <Select
                name="category_id"
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setClassId(null);
                }}
              >
                <SelectTrigger id={`category-${mapping.description}`}>
                  <SelectValue placeholder="Select a category" />
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
              <Label htmlFor={`class-${mapping.description}`}>Class</Label>
              <Select
                name="class_id"
                value={classId}
                onValueChange={setClassId}
                disabled={!categoryId || classesForCategory.length === 0}
              >
                <SelectTrigger id={`class-${mapping.description}`}>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" form={`edit-mapping-${mapping.description}`}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
