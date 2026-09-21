/** "10:00 AM" or "10:00 AM – 1:00 PM" from Postgres time strings (HH:MM[:SS]). */
export function formatEventTime(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  };
  if (!end || end.slice(0, 5) === start.slice(0, 5)) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}
