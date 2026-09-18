import { format } from "date-fns";

/** "4th September, 2022" — matches the style used across the public site. */
export function formatLongDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "do MMMM, yyyy");
}
