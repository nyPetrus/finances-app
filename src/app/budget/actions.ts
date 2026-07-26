"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBudgetYear(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const year = Number(formData.get("year"));
  if (!Number.isFinite(year)) return;

  const rows: {
    user_id: string;
    year: number;
    month: number;
    category_id: string;
    planned_amount: number;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^amount__(.+)__(\d{1,2})$/);
    if (!match) continue;

    const [, categoryId, monthStr] = match;
    const amount = Number(value);

    rows.push({
      user_id: user.id,
      year,
      month: Number(monthStr),
      category_id: categoryId,
      planned_amount: Number.isFinite(amount) ? amount : 0,
    });
  }

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("budget_items")
    .upsert(rows, { onConflict: "user_id,year,month,category_id" });

  if (error) throw new Error(error.message);

  revalidatePath("/budget");
}
