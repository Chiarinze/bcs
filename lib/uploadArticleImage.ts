import { generateBlurPlaceholder } from "./blurPlaceholder";

export async function uploadArticleImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/articles/upload-image", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Upload failed");
  }

  const { url: publicUrl } = await res.json();

  let blurData: string | null = null;
  try {
    blurData = await generateBlurPlaceholder(file);
  } catch {
    blurData = null;
  }

  return { publicUrl, blurData };
}
