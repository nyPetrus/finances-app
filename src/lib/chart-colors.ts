// Palette assigned to chart series by position (e.g. one bar per category in
// the Dashboard's spending chart). Categories themselves no longer store a
// color (they're identified by an icon instead — see category-icons.ts);
// this exists purely so charts have something to render with, independent
// of any per-category choice.
export const CHART_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
];

// Hue/chroma anchors for the Dashboard's income/expense/transfer colors,
// taken from the app's own existing tokens rather than eyeballed hex, so
// "red" here is the same red as `text-destructive` everywhere else in the
// app: --destructive (globals.css) is oklch(0.577 0.245 27.325); Tailwind's
// built-in emerald-600 (already used for positive amounts) is
// oklch(0.596 0.145 163.225); --muted-foreground is oklch(0.556 0 0).
export const EXPENSE_HUE = { h: 27.325, c: 0.245 };
export const INCOME_HUE = { h: 163.225, c: 0.145 };
export const TRANSFER_HUE = { h: 0, c: 0 };

export const EXPENSE_FLAT = "oklch(0.577 0.245 27.325)";
export const INCOME_FLAT = "oklch(0.596 0.145 163.225)";
export const TRANSFER_FLAT = "oklch(0.556 0 0)";

// One hue, monotone lightness steps (sequential encoding of magnitude) --
// rank 0 is the highest value and gets the darkest step, the last rank
// gets the lightest. A single-entry chart (count === 1) gets the darkest
// step. Out-of-gamut steps are gamut-mapped by the browser automatically.
export function sequentialColor(
  hue: { h: number; c: number },
  rank: number,
  count: number,
) {
  const t = count <= 1 ? 0 : rank / (count - 1);
  const lightness = 0.35 + t * (0.82 - 0.35);
  return `oklch(${lightness.toFixed(3)} ${hue.c} ${hue.h})`;
}
