import { detectImageType, type AcceptedImage } from "@/lib/detectImageType";

/**
 * Magic-byte detection for event documents: PDF, Office (docx/xlsx/pptx are
 * zip containers) and the image types we already accept.
 */
export function detectDocumentType(buffer: Buffer, originalName: string): AcceptedImage | null {
  const image = detectImageType(buffer);
  if (image) return image;

  if (buffer.length < 4) return null;

  // %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mime: "application/pdf", ext: "pdf" };
  }

  // PK\x03\x04 — zip container; trust the extension only among Office types.
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const ext = originalName.split(".").pop()?.toLowerCase();
    const office: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };
    if (ext && office[ext]) return { mime: office[ext], ext };
  }

  return null;
}
