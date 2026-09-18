import { supabase } from "./supabaseClient";
import { generateBlurPlaceholder } from "./blurPlaceholder";

/**
 * Uploads image to Supabase Storage and generates a blur placeholder color.
 */
export async function uploadEventImage(file: File) {
  const fileName = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("event-images")
    .upload(fileName, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from("event-images")
    .getPublicUrl(fileName);

  const publicUrl = publicUrlData.publicUrl;

  // Generate a simple color-based placeholder blur
  let blurData: string | null = null;
  try {
    blurData = await generateBlurPlaceholder(file);
  } catch {
    blurData = null;
  }

  return { publicUrl, blurData };
}
