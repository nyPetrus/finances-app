import { redirect } from "next/navigation";

// The Transactions page was folded into Search, which now opens on the
// current month by default. Kept only as a redirect so old links and
// bookmarks still land somewhere sensible: `?month=YYYY-MM` becomes
// Search's "Date: <month>" filter.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    redirect(`/search?dateGranularity=month&dateOp=on&dateValue=${month}`);
  }
  redirect("/search");
}
