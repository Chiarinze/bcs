import { supabase } from "./supabaseClient";

export async function uploadEventDocument(file: File, eventId: string) {
  // Create a clean path: event-id/timestamp-filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${eventId}/${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from("event-documents")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("event-documents")
    .getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl,
    path: data.path, // We store this to delete the file later
  };
}