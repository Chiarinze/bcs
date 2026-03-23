import { supabase } from "./supabaseClient";

async function generateColorPlaceholder(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("");

        canvas.width = 8;
        canvas.height = 8;
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;

        let r = 0,
          g = 0,
          b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }

        const pixelCount = data.length / 4;
        r = Math.round(r / pixelCount);
        g = Math.round(g / pixelCount);
        b = Math.round(b / pixelCount);

        const blurCanvas = document.createElement("canvas");
        blurCanvas.width = 1;
        blurCanvas.height = 1;
        const blurCtx = blurCanvas.getContext("2d");
        if (!blurCtx) return resolve("");
        blurCtx.fillStyle = `rgb(${r},${g},${b})`;
        blurCtx.fillRect(0, 0, 1, 1);
        resolve(blurCanvas.toDataURL());
      };
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadArticleImage(file: File) {
  const fileName = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("article-images")
    .upload(fileName, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from("article-images")
    .getPublicUrl(fileName);

  const publicUrl = publicUrlData.publicUrl;

  let blurData: string | null = null;
  try {
    blurData = await generateColorPlaceholder(file);
  } catch {
    blurData = null;
  }

  return { publicUrl, blurData };
}
