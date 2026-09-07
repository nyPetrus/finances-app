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
import { addMappedDescription } from "./actions";

export function AddMappingDialog({ categories, classes }: { categories: Category[]; classes: Class[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);

  const classesForCategory = categoryId ? classes.filter((c) => c.category_id === categoryId) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setError(null);
          setCategoryId(null);
          setClassId(null);
        }
      }}
    >
      <DialogTrigger render={<Button />}>Add mapping</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New description mapping</DialogTitle>
        </DialogHeader>
        <form
          id="add-mapping-form"
          action={async (formData) => {
            try {
              await addMappedDescription(formData);
              setOpen(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create mapping.");
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" required autoFocus placeholder="e.g. mercado" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="check_type">Check type</Label>
            <Select name="check_type" defaultValue="equal_to">
              <SelectTrigger id="check_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal_to">Equal to</SelectItem>
                <SelectItem value="starts_with">Starts with</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              name="category_id"
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                setClassId(null);
              }}
              required
            >
              <SelectTrigger id="category_id">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" form="add-mapping-form">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
