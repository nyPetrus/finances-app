"use client";

import { useRef, useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
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
import { addMappedDescription, syncMappedDescriptions } from "./actions";

export function AddMappingDialog({
  categories,
  classes,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  defaultDescription,
  showTrigger = true,
}: {
  categories: Category[];
  classes: Class[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDescription?: string;
  showTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [isSyncing, startSync] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const classesForCategory = categoryId ? classes.filter((c) => c.category_id === categoryId) : [];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(null);
      setCategoryId(null);
      setClassId(null);
    }
  }

  function handleCreateAndSync() {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    setError(null);
    startSync(async () => {
      try {
        await addMappedDescription(formData);
        const count = await syncMappedDescriptions();
        setOpen(false);
        toast.success(
          count === 1 ? "Mapping created — 1 transaction categorized." : `Mapping created — ${count} transactions categorized.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create mapping.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Add mapping" title="Add mapping" />}>
          <PlusIcon />
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New description mapping</DialogTitle>
        </DialogHeader>
        <form
          id="add-mapping-form"
          ref={formRef}
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
            <Input
              id="description"
              name="description"
              required
              autoFocus
              placeholder="e.g. mercado"
              defaultValue={defaultDescription}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="check_type">Operator</Label>
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
            <Button type="button" variant="outline" onClick={handleCreateAndSync} disabled={isSyncing}>
              {isSyncing ? "Syncing…" : "Create and sync"}
            </Button>
            <Button type="submit" form="add-mapping-form" disabled={isSyncing}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
