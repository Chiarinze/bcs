/**
 * Browser helpers that send files to /api/upload. Storage buckets are
 * closed to direct client writes; everything goes through the server,
 * which checks the session and the file's real type.
 */
async function upload(purpose: string, file: File, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append("purpose", purpose);
  fd.append("file", file);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data as { url: string; path: string };
}

export const uploadEventImageFile = (file: File) => upload("event-image", file);
export const uploadEventDocumentFile = (file: File, eventId: string) =>
  upload("event-document", file, { event_id: eventId });
export const uploadPassportFile = (file: File) => upload("passport", file);
