import { redirect } from "next/navigation";

// Classes are managed on the combined Categories & Classes tree page now,
// expanded under each category they belong to. Kept only as a redirect so
// old links and bookmarks still land somewhere sensible.
export default function ClassesPage() {
  redirect("/categories");
}
