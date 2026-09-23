"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GORDURA_LABELS, pickableCategories, pickableClasses } from "@/lib/classification";
import type { Category, Class, Gordura } from "@/lib/supabase/types";

// The Category + Class (+ optional Gordura override) pickers shared by every
// transaction and description-mapping dialog. Posts `category_id`,
// `class_id` and — when `gordura` is passed — `gordura` ("default" | "high"
// | "low"; "default" means no override).
export function ClassificationFields({
  categories,
  classes,
  categoryId,
  classId,
  onCategoryChange,
  onClassChange,
  gordura,
  onGorduraChange,
}: {
  categories: Category[];
  classes: Class[];
  categoryId: string | null;
  classId: string | null;
  onCategoryChange: (value: string | null) => void;
  onClassChange: (value: string | null) => void;
  gordura?: Gordura | null;
  onGorduraChange?: (value: Gordura | null) => void;
}) {
  const categoryOptions = pickableCategories(categories, categoryId);
  const classOptions = pickableClasses(classes, categoryId, classId);
  const selectedClass = classId ? classes.find((c) => c.id === classId) : undefined;
  const classDefault = selectedClass?.default_gordura;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category_id">Category</Label>
          <Select
            name="category_id"
            value={categoryId}
            onValueChange={(value) => {
              onCategoryChange(value);
              onClassChange(null);
            }}
          >
            <SelectTrigger id="category_id">
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
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
            onValueChange={onClassChange}
            disabled={!categoryId || classOptions.length === 0}
          >
            <SelectTrigger id="class_id">
              <SelectValue
                placeholder={!categoryId ? "Pick a category first" : classOptions.length === 0 ? "No classes" : "None"}
              />
            </SelectTrigger>
            <SelectContent>
              {classOptions.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {onGorduraChange && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="gordura">Gordura</Label>
          <Select
            name="gordura"
            value={gordura ?? "default"}
            onValueChange={(value) => onGorduraChange(value === "high" || value === "low" ? value : null)}
          >
            <SelectTrigger id="gordura">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                Class default ({classDefault ? GORDURA_LABELS[classDefault] : "none"})
              </SelectItem>
              <SelectItem value="high">{GORDURA_LABELS.high}</SelectItem>
              <SelectItem value="low">{GORDURA_LABELS.low}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
