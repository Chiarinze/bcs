import { createServerSupabase } from "@/lib/supabaseServer";
import type { Performance } from "@/types";

/** All performances, most recent first. */
export async function getPerformances(): Promise<Performance[]> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("performances")
    .select("*")
    .order("performed_on", { ascending: false });
  return (data || []) as Performance[];
}
