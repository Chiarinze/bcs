export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}
