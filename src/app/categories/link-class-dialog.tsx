"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Class } from "@/lib/supabase/types";
import { linkClassToCategory } from "@/app/classes/actions";

// Adds an already-existing class under one more category — the alternative to
// "Add class" (which creates a new one) on a category row's "⋮" menu.
export function LinkClassDialog({
  category,
  classes,
  onClose,
}: {
  category: Category;
  classes: Class[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const options = classes.filter((classItem) => classItem.is_active && !classItem.category_ids.includes(category.id));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link existing class to {category.name}</DialogTitle>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every active class is already in this category.</p>
        ) : (
          <form
            id="link-class-form"
            action={(formData) => {
              const classId = formData.get("class_id");
              if (typeof classId !== "string" || !classId) {
                setError("Pick a class.");
                return;
              }
              setError(null);
              startSave(async () => {
                try {
                  const result = await linkClassToCategory(classId, category.id);
                  if (result.error) setError(result.error);
                  else onClose();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to link class.");
                }
              });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="class_id">Class</Label>
              <Select name="class_id" required>
                <SelectTrigger id="class_id">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" form="link-class-form" disabled={isSaving}>
                {isSaving ? "Linking…" : "Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
