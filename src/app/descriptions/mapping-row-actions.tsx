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
  const [categoryId, setCategoryId] = useState<string | null>(mapping.category_id);
  const [classId, setClassId] = useState<string | null>(mapping.class_id);

  const classesForCategory = categoryId ? classes.filter((c) => c.category_id === categoryId) : [];

  return (
    <div className="flex items-center gap-2">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setCategoryId(mapping.category_id);
            setClassId(mapping.class_id);
          }
        }}
      >
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit mapping</DialogTitle>
          </DialogHeader>
          <form
            id={`edit-mapping-${mapping.description}`}
            action={async (formData) => {
              await updateMappedDescription(formData);
              setOpen(false);
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
            <DialogFooter>
              <Button type="submit" form={`edit-mapping-${mapping.description}`}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <form
        action={async (formData) => {
          if (window.confirm(`Delete mapping for "${mapping.description}"?`)) {
            await deleteMappedDescription(formData);
          }
        }}
      >
        <input type="hidden" name="description" value={mapping.description} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </form>
    </div>
  );
}
