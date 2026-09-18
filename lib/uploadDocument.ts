import { uploadEventDocumentFile } from "./uploadClient";

export async function uploadEventDocument(file: File, eventId: string) {
  const { url, path } = await uploadEventDocumentFile(file, eventId);
  return {
    url,
    path, // stored so DELETE /api/events/[slug]/documents can remove the file
  };
}
