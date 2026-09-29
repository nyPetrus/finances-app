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
import { IconSwatchPicker } from "@/components/icon-swatch-picker";
import { DEFAULT_CLASS_ICON } from "@/lib/category-icons";
import { AutonomyOptionLabel } from "@/components/autonomy-icon";
import type { Category, Class } from "@/lib/supabase/types";

// Name, icon, linked categories and default autonomy — shared by the Add and Edit
// class dialogs. Posts `name`, `icon`, one `category_ids` per checked category, and
// `autonomy` ("none" | "high" | "low").
export function ClassFormFields({
  categories,
  classItem,
  defaultCategoryIds,
  autoFocus,
}: {
  categories: Category[];
  classItem?: Class;
  // New classes only: categories checked up front.
  defaultCategoryIds?: string[];
  autoFocus?: boolean;
}) {
  const [icon, setIcon] = useState(classItem?.icon ?? DEFAULT_CLASS_ICON);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set(classItem?.category_ids ?? defaultCategoryIds ?? []));

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
        <Label>Icon</Label>
        <IconSwatchPicker name="icon" value={icon} onChange={setIcon} />
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
        <Label htmlFor="autonomy">Default autonomy</Label>
        <Select name="autonomy" defaultValue={classItem?.autonomy ?? "none"}>
          <SelectTrigger id="autonomy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (defaults to <AutonomyOptionLabel autonomy="high" />)</SelectItem>
            <SelectItem value="high"><AutonomyOptionLabel autonomy="high" /></SelectItem>
            <SelectItem value="low"><AutonomyOptionLabel autonomy="low" /></SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
