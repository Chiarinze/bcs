import { createServerSupabase } from "@/lib/supabaseServer";
import { sources } from "./sources";
import type { RawGrant } from "./sources";

interface ScanResult {
  newCount: number;
  errors: string[];
}

export async function scanForGrants(): Promise<ScanResult> {
  const supabase = createServerSupabase();
  const allGrants: (RawGrant & { source_name: string; source_url: string })[] =
    [];
  const errors: string[] = [];

  // Fetch from all sources in parallel — each source fails independently
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      try {
        const grants = await source.fetch();
        return grants.map((g) => ({
          ...g,
          source_name: source.name,
          source_url: source.url,
        }));
      } catch (err) {
        errors.push(`${source.name}: ${(err as Error).message}`);
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allGrants.push(...result.value);
    }
  }

  if (allGrants.length === 0) {
    return { newCount: 0, errors };
  }

  // Upsert with dedup on external_url — duplicates are silently skipped
  const { data, error } = await supabase
    .from("grant_opportunities")
    .upsert(
      allGrants.map((g) => ({
        title: g.title,
        description: g.description || null,
        source_name: g.source_name,
        source_url: g.source_url,
        external_url: g.external_url,
        deadline: g.deadline || null,
        amount: g.amount || null,
      })),
      { onConflict: "external_url", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    errors.push(`Supabase upsert: ${error.message}`);
    return { newCount: 0, errors };
  }

  return { newCount: data?.length || 0, errors };
}
