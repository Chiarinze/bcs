// Shared recital helpers (date math, rubric).

export const RECITAL_RUBRIC = [
  { key: "score_diction", label: "Diction" },
  { key: "score_costume", label: "Costume" },
  { key: "score_vocal_production", label: "Vocal Production" },
  { key: "score_accompaniment", label: "Accompaniment" },
  { key: "score_expression", label: "Expression" },
] as const;

export const RECITAL_MAX_PER_CRITERION = 20;
export const RECITAL_MAX_TOTAL = 100;

// "YYYY-MM-DD" → Date in local time (avoids UTC shift)
export function parseISODate(s: string): Date {
  return new Date(s + "T00:00:00");
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function isFriday(d: Date): boolean {
  return d.getDay() === 5;
}

// All Fridays inclusive of `from` (or the next Friday after it) up to `to`.
export function fridaysBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  // Advance to the first Friday >= cursor
  const offset = (5 - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + offset);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    out.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

export function formatRecitalDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
