import { createServerSupabase } from "@/lib/supabaseServer";
import type { DirectoryGroup, MembershipStatus, PublicProfile } from "@/types";

export const DIRECTORY_COLUMNS =
  "id, first_name, last_name, other_name, photo_url, bio, slug, ensemble_arm, choir_part, orchestra_instrument, membership_status, year_inducted";

export const STATUS_LABELS: Record<MembershipStatus, string> = {
  full_member: "Full Members",
  probationary: "Probationary Members",
  it_student: "IT Students",
};

const STATUS_ORDER: MembershipStatus[] = ["full_member", "probationary", "it_student"];

/**
 * Members eligible for the public directory: verified, profile complete,
 * account open, and not hidden. Grouped by membership status in display order.
 */
export async function getDirectoryGroups(): Promise<DirectoryGroup[]> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select(DIRECTORY_COLUMNS)
    .eq("role", "member")
    .eq("is_verified", true)
    .eq("profile_completed", true)
    .eq("directory_hidden", false)
    .is("closed_at", null)
    .order("first_name")
    .order("last_name");

  const members = (data || []) as PublicProfile[];

  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    members: members.filter((m) => m.membership_status === status),
  })).filter((g) => g.members.length > 0);
}

/** One directory member by slug, applying the same visibility rules. */
export async function getDirectoryMemberBySlug(slug: string): Promise<PublicProfile | null> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select(DIRECTORY_COLUMNS)
    .eq("slug", slug)
    .eq("role", "member")
    .eq("is_verified", true)
    .eq("profile_completed", true)
    .eq("directory_hidden", false)
    .is("closed_at", null)
    .maybeSingle();

  return (data as PublicProfile | null) ?? null;
}

const ARM_LABELS: Record<string, string> = {
  choir: "Chorale",
  orchestra: "Orchestra",
  choir_orchestra: "Chorale & Orchestra",
  choir_band: "Chorale & Band",
  orchestra_band: "Orchestra & Band",
  choir_orchestra_band: "Chorale, Orchestra & Band",
};

/** "Chorale · Soprano" / "Orchestra · Violin" style line for a card. */
export function describeMember(m: PublicProfile): string {
  const parts: string[] = [];
  if (m.ensemble_arm) parts.push(ARM_LABELS[m.ensemble_arm] || m.ensemble_arm);
  if (m.choir_part) parts.push(m.choir_part);
  if (m.orchestra_instrument) parts.push(m.orchestra_instrument);
  return parts.join(" · ");
}
