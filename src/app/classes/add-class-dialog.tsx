"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/supabase/types";
import { addClass } from "./actions";
import { ClassFormFields } from "./class-form-fields";

export function AddClassDialog({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Add class" title="Add class" />}>
        <PlusIcon />
      </DialogTrigger>
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
              else setOpen(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create class.");
            }
          }}
          className="flex flex-col gap-4"
        >
          <ClassFormFields categories={categories} autoFocus />
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
