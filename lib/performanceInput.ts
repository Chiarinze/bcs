/** Shared validation for performance create/update payloads. */
export interface PerformanceInput {
  title: string;
  performed_on: string;
  location: string | null;
  image_url: string;
  image_blur_data: string | null;
  link: string | null;
}

export function parsePerformanceInput(
  body: Record<string, unknown>,
  { requireImage }: { requireImage: boolean }
): { value?: PerformanceInput; error?: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) return { error: "Title is required (max 200 chars)" };

  const performed_on = typeof body.performed_on === "string" ? body.performed_on : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performed_on) || Number.isNaN(Date.parse(performed_on))) {
    return { error: "A valid date is required" };
  }

  const location =
    typeof body.location === "string" && body.location.trim()
      ? body.location.trim().slice(0, 200)
      : null;

  const image_url = typeof body.image_url === "string" ? body.image_url.trim() : "";
  const bucketPrefix =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "") + "/storage/v1/object/public/performance-images/";
  if (requireImage && !image_url) return { error: "An image is required" };
  if (image_url && !image_url.startsWith(bucketPrefix)) {
    return { error: "image_url must point to the performance-images bucket" };
  }

  const image_blur_data =
    typeof body.image_blur_data === "string" && body.image_blur_data.startsWith("data:image/")
      ? body.image_blur_data.slice(0, 2000)
      : null;

  const link = typeof body.link === "string" && body.link.trim() ? body.link.trim() : null;
  if (link && !/^https?:\/\//i.test(link)) return { error: "Link must start with http(s)://" };

  return { value: { title, performed_on, location, image_url, image_blur_data, link } };
}
