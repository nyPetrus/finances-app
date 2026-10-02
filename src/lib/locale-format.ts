// Brazilian number/date conventions for text the user types or reads in a
// form field: comma decimals ("-1.234,56") and day-first dates
// ("05/10/2026"). Native <input type="number"/"date"> can't be used for
// this — browsers format them from their own UI language (an English
// Chrome shows "-1234.56" and "10/05/2026"), and a page can't override it.
// Values sent to the server stay canonical ("-1234.56", "2026-10-05").

// Lenient parse: a comma is always the decimal separator (dots before it
// are thousands separators); without a comma, dots are thousands separators
// only when they group exactly three digits ("1.234" → 1234), otherwise a
// dot is read as a decimal point ("50.5" → 50.5).
export function parseBRNumber(text: string): number | null {
  const raw = text.trim().replace(/\s/g, "");
  if (raw === "") return null;
  let normalized: string;
  if (raw.includes(",")) normalized = raw.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, "");
  else normalized = raw;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// For a field's initial text: comma decimal, no thousands grouping (easier
// to edit). `fixed` pads to two decimals, for money amounts.
export function formatBRNumberInput(value: number, { fixed = true } = {}): string {
  const text = fixed ? value.toFixed(2) : String(value);
  return text.replace(".", ",");
}

// "2026-10-05" ↔ "05/10/2026".
export function isoToBRDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

export function brDateToISO(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
