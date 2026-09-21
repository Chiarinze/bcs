import { createServerSupabase } from "@/lib/supabaseServer";
import type {
  AboutContent,
  ContactContent,
  LinksContent,
  SiteContentKey,
  SiteContentMap,
} from "@/types";

/**
 * Fallback copy used when the `site_content` row is missing or a field is
 * empty. Mirrors the seed in db/site_content.sql so the public site never
 * renders a blank section.
 */
export const DEFAULT_ABOUT: AboutContent = {
  tagline:
    "The Benin Chorale and Philharmonic Nigeria — promoting musical excellence, education, and cultural preservation through choral and orchestral performances.",
  home_intro:
    "The Benin Chorale and Philharmonic Nigeria is a premier musical ensemble in Benin City dedicated to advancing choral and orchestral music while preserving and innovating within Nigeria's traditions.",
  intro: [],
  mission: "",
  vision: "",
  what_we_do: [],
  repertoire_intro: "We perform a range of music — both sacred and secular — including:",
  repertoire: [],
  services: "",
  join_us: "",
  arms: [],
  management_units: [],
};

export const DEFAULT_CONTACT: ContactContent = {
  tagline:
    "We’d love to hear from you. Whether for bookings, collaborations, or general inquiries — reach out and let’s make music together.",
  phone: "+2348078742682",
  email: "info@beninchoraleandphilharmonic.com",
  facebook: "",
  instagram: "",
  description: "",
  digital_services_intro: "",
  digital_services: [],
};

export const DEFAULT_LINKS: LinksContent = {
  music_scores_url: "",
};

const DEFAULTS: SiteContentMap = {
  about: DEFAULT_ABOUT,
  contact: DEFAULT_CONTACT,
  links: DEFAULT_LINKS,
};

/**
 * Loads one site_content document, merged over its defaults so newly added
 * fields always have a value even before the admin saves the form.
 */
export async function getSiteContent<K extends SiteContentKey>(
  key: K
): Promise<SiteContentMap[K]> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const stored = (data?.value ?? {}) as Partial<SiteContentMap[K]>;
  return { ...DEFAULTS[key], ...stored };
}
