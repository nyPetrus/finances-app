"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pickableCategories, pickableClasses } from "@/lib/classification";
import { AutonomyOptionLabel } from "@/components/autonomy-icon";
import type { Category, Class, Autonomy } from "@/lib/supabase/types";
import { bulkUpdateClassification } from "../transactions/actions";

// Sentinels distinct from any real id/Autonomy value — see their use below.
const NO_CHANGE = "__no_change__";
const CLEAR = "__clear__";

// Batch-edits Category/Class/Autonomy across every selected transaction —
// the Search page's selection toolbar "Edit" button. Each field defaults to
// "No change" (the field is left out of the update entirely, per
// bulkUpdateClassification's presence-based semantics) so the user can
// touch just one field (say, only Autonomy) without being forced to also
// commit a Category/Class for every selected row.
export function BulkEditDialog({
  open,
  onOpenChange,
  transactionIds,
  categories,
  classes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionIds: string[];
  categories: Category[];
  classes: Class[];
  onSaved: () => void;
}) {
  const [categoryValue, setCategoryValue] = useState(NO_CHANGE);
  const [classValue, setClassValue] = useState(NO_CHANGE);
  const [autonomyValue, setAutonomyValue] = useState(NO_CHANGE);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  const categoryOptions = pickableCategories(categories, null);
  // Once a specific category is chosen, narrow Class to the ones linked to
  // it (same picker rule the single-transaction edit dialog uses) — with
  // "No change"/"Uncategorized" chosen instead, there's no single category
  // to narrow by, so every active class stays offered.
  const classOptions =
    categoryValue !== NO_CHANGE && categoryValue !== CLEAR
      ? pickableClasses(classes, categoryValue, null)
      : classes.filter((classItem) => classItem.is_active);

  function reset() {
    setCategoryValue(NO_CHANGE);
    setClassValue(NO_CHANGE);
    setAutonomyValue(NO_CHANGE);
    setError(null);
  }

  function handleCategoryChange(rawValue: string | null) {
    const value = rawValue ?? NO_CHANGE;
    setCategoryValue(value);
    // Drop a stale Class choice that no longer belongs to the newly picked
    // category, rather than leaving the Select pointed at a hidden option.
    if (classValue === NO_CHANGE || classValue === CLEAR) return;
    const stillValid = value !== NO_CHANGE && value !== CLEAR && pickableClasses(classes, value, null).some((c) => c.id === classValue);
    if (!stillValid) setClassValue(NO_CHANGE);
  }

  function handleSave() {
    const updates: { category_id?: string | null; class_id?: string | null; autonomy?: Autonomy | null } = {};
    if (categoryValue !== NO_CHANGE) updates.category_id = categoryValue === CLEAR ? null : categoryValue;
    if (classValue !== NO_CHANGE) updates.class_id = classValue === CLEAR ? null : classValue;
    if (autonomyValue !== NO_CHANGE) updates.autonomy = autonomyValue === CLEAR ? null : (autonomyValue as Autonomy);

    if (Object.keys(updates).length === 0) {
      setError("Choose at least one field to change.");
      return;
    }

    setError(null);
    startSave(async () => {
      try {
        await bulkUpdateClassification(transactionIds, updates);
        toast.success(
          transactionIds.length === 1
            ? "1 transaction updated."
            : `${transactionIds.length} transactions updated.`,
        );
        reset();
        onOpenChange(false);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update transactions.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {transactionIds.length === 1 ? "1 transaction" : `${transactionIds.length} transactions`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Only the fields you change below are applied — leave a field on &ldquo;No change&rdquo; to keep each
            transaction&rsquo;s own value.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-category">Category</Label>
            <Select value={categoryValue} onValueChange={handleCategoryChange}>
              <SelectTrigger id="bulk-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>No change</SelectItem>
                <SelectItem value={CLEAR}>Uncategorized</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-class">Class</Label>
            <Select value={classValue} onValueChange={(value) => setClassValue(value ?? NO_CHANGE)}>
              <SelectTrigger id="bulk-class" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>No change</SelectItem>
                <SelectItem value={CLEAR}>No class</SelectItem>
                {classOptions.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-autonomy">Autonomy</Label>
            <Select value={autonomyValue} onValueChange={(value) => setAutonomyValue(value ?? NO_CHANGE)}>
              <SelectTrigger id="bulk-autonomy" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>No change</SelectItem>
                <SelectItem value={CLEAR}>Class default</SelectItem>
                <SelectItem value="high"><AutonomyOptionLabel autonomy="high" /></SelectItem>
                <SelectItem value="low"><AutonomyOptionLabel autonomy="low" /></SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
