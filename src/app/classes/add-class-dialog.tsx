"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/supabase/types";
import { addClass } from "./actions";
import { ClassFormFields } from "./class-form-fields";

// Opened from the Categories & Classes page — its "+" menu (no category
// preselected) or a category row's "Add class" (`defaultCategoryId`).
export function AddClassDialog({
  categories,
  defaultCategoryId,
  open,
  onOpenChange,
}: {
  categories: Category[];
  defaultCategoryId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New class</DialogTitle>
        </DialogHeader>
        <form
          id="add-class-form"
          action={async (formData) => {
            try {
              const result = await addClass(formData);
              if (result.error) setError(result.error);
              else onOpenChange(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create class.");
            }
          }}
          className="flex flex-col gap-4"
        >
          <ClassFormFields
            categories={categories}
            defaultCategoryIds={defaultCategoryId ? [defaultCategoryId] : undefined}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" form="add-class-form">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
