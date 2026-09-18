import { createServerSupabase } from "@/lib/supabaseServer";
import type { LeadershipEntry, PublicProfile, RoleCategory } from "@/types";

const PUBLIC_PROFILE_COLUMNS =
  "id, first_name, last_name, other_name, photo_url, bio, slug, ensemble_arm, choir_part, orchestra_instrument, membership_status";

interface RoleRow {
  id: string;
  title: string;
  category: RoleCategory;
  sort_order: number;
  assignee: PublicProfile | PublicProfile[] | null;
}

function unwrap(assignee: RoleRow["assignee"]): PublicProfile | null {
  if (!assignee) return null;
  return Array.isArray(assignee) ? assignee[0] ?? null : assignee;
}

/**
 * Roles of a category together with the member currently holding each.
 * Unassigned roles are omitted — the public site only shows real people.
 * "executive" roles are the Board of Directors; "management" covers
 * part leaders and directorate heads.
 */
export async function getLeadership(
  category: RoleCategory
): Promise<LeadershipEntry[]> {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("member_roles")
    .select(
      `id, title, category, sort_order, assignee:profiles!assigned_to(${PUBLIC_PROFILE_COLUMNS})`
    )
    .eq("category", category)
    .not("assigned_to", "is", null)
    .order("sort_order")
    .order("title");

  return ((data || []) as unknown as RoleRow[])
    .map((row) => ({ role: { id: row.id, title: row.title, category: row.category, sort_order: row.sort_order }, profile: unwrap(row.assignee) }))
    .filter((entry): entry is LeadershipEntry => entry.profile !== null);
}

/** A single board member by profile slug, or null if they hold no executive role. */
export async function getBoardMemberBySlug(
  slug: string
): Promise<LeadershipEntry | null> {
  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("slug", slug)
    .eq("role", "member")
    .maybeSingle();

  if (!profile) return null;

  const { data: role } = await supabase
    .from("member_roles")
    .select("id, title, category, sort_order")
    .eq("assigned_to", profile.id)
    .eq("category", "executive")
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (!role) return null;

  return { role, profile: profile as PublicProfile };
}

export function fullName(p: Pick<PublicProfile, "first_name" | "last_name" | "other_name">) {
  return [p.first_name, p.other_name, p.last_name].filter(Boolean).join(" ");
}
