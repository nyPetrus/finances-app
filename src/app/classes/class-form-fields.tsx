"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import { GORDURA_LABELS } from "@/lib/classification";
import type { Category, Class } from "@/lib/supabase/types";

// Name, linked categories and default gordura — shared by the Add and Edit
// class dialogs. Posts `name`, one `category_ids` per checked category, and
// `default_gordura` ("none" | "high" | "low").
export function ClassFormFields({
  categories,
  classItem,
  autoFocus,
}: {
  categories: Category[];
  classItem?: Class;
  autoFocus?: boolean;
}) {
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set(classItem?.category_ids ?? []));

  // Inactive categories aren't offered for new links, but ones already linked
  // stay visible so they can be unlinked.
  const options = categories.filter((category) => category.is_active || categoryIds.has(category.id));

  function toggle(id: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={classItem?.name} required autoFocus={autoFocus} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Categories</Label>
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-lg border p-2">
          {options.map((category) => (
            <label key={category.id} className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={categoryIds.has(category.id)} onCheckedChange={() => toggle(category.id)} />
              <CategoryIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{category.name}</span>
            </label>
          ))}
        </div>
        {[...categoryIds].map((id) => (
          <input key={id} type="hidden" name="category_ids" value={id} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="default_gordura">Default gordura</Label>
        <Select name="default_gordura" defaultValue={classItem?.default_gordura ?? "none"}>
          <SelectTrigger id="default_gordura">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (choose per transaction)</SelectItem>
            <SelectItem value="high">{GORDURA_LABELS.high} — finite commitment</SelectItem>
            <SelectItem value="low">{GORDURA_LABELS.low} — recurs indefinitely</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
