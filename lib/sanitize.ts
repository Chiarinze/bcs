/**
 * Sanitize a search string for use in Supabase PostgREST `.or()` / `.ilike()` filters.
 * Strips characters that could break or manipulate filter syntax (commas, dots, parentheses, etc.).
 */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[%,.*()\\]/g, "").trim();
}
