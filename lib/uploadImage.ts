import { generateBlurPlaceholder } from "./blurPlaceholder";
import { uploadEventImageFile } from "./uploadClient";

/**
 * Uploads an event image via the server and generates a blur placeholder.
 */
export async function uploadEventImage(file: File) {
  const { url: publicUrl } = await uploadEventImageFile(file);

  let blurData: string | null = null;
  try {
    blurData = await generateBlurPlaceholder(file);
  } catch {
    blurData = null;
  }

  return { publicUrl, blurData };
}
