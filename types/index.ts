export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  end_date?: string | null;
  slug: string;
  location?: string;
  is_paid: boolean;
  price?: number | null;
  image_url?: string | null;
  image_blur_data?: string | null;
  created_at?: string;
  is_internal?: boolean;
  event_type?: "standard" | "internal" | "audition";
  registration_closed?: boolean;
  // Paper presentation option (public events)
  collect_paper_info?: boolean;
  paper_submission_email?: string | null;
  paper_deadline?: string | null;
  paper_signature?: string | null;
}

export interface Ticket {
  id: string;
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  amount_paid: number;
  seller?: string | null;
  payment_ref: string;
  coupon_code?: string | null;
  category?: string | null;
  affiliation?: string | null;
  presenting_paper?: boolean | null;
  paper_title?: string | null;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  usage_limit?: number | null;
  usage_count: number;
  is_active: boolean;
  created_at?: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  price: number;
}

// ========== Member / Profile Types ==========

export type MembershipStatus = "full_member" | "probationary" | "it_student";
export type EnsembleArm = "choir" | "orchestra" | "choir_orchestra" | "choir_band" | "orchestra_band" | "choir_orchestra_band";
export type UserRole = "admin" | "member";

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  other_name: string | null;
  email: string;
  membership_status: MembershipStatus;
  is_verified: boolean;
  profile_completed: boolean;
  date_of_birth: string | null;
  physical_address: string | null;
  ensemble_arm: EnsembleArm | null;
  choir_part: string | null;
  orchestra_instrument: string | null;
  photo_url: string | null;
  year_inducted: number | null;
  membership_id: string | null;
  closed_at: string | null;
  closure_reason: string | null;
  bio: string | null;
  slug: string | null;
  directory_hidden: boolean;
  directory_request: DirectoryRequest | null;
  directory_request_at: string | null;
  directory_request_note: string | null;
  created_at: string;
}

export type DirectoryRequest = "hide" | "show";

/** Fields of a profile that are safe to render on public pages. */
export type PublicProfile = Pick<
  Profile,
  | "id"
  | "first_name"
  | "last_name"
  | "other_name"
  | "photo_url"
  | "bio"
  | "slug"
  | "ensemble_arm"
  | "choir_part"
  | "orchestra_instrument"
  | "membership_status"
  | "year_inducted"
>;

export interface DirectoryGroup {
  status: MembershipStatus;
  label: string;
  members: PublicProfile[];
}

export interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  membership_status: MembershipStatus;
}

export interface ProfileSetupData {
  first_name: string;
  last_name: string;
  other_name: string;
  date_of_birth: string;
  physical_address: string;
  ensemble_arm: EnsembleArm;
  choir_part: string | null;
  orchestra_instrument: string | null;
  photo_url: string | null;
}

export interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  message: string | null;
  payment_reference: string;
  created_at: string;
}

// ========== Member Role Types ==========

export type RoleCategory = "executive" | "management";

export interface MemberRole {
  id: string;
  title: string;
  category: RoleCategory;
  assigned_to: string | null;
  choir_part_required: string | null;
  sort_order: number;
  created_at: string;
  assignee?: Pick<Profile, "id" | "first_name" | "last_name" | "photo_url" | "choir_part" | "bio" | "slug"> | null;
}

/** A role together with the public profile of the member holding it. */
export interface LeadershipEntry {
  role: Pick<MemberRole, "id" | "title" | "category" | "sort_order">;
  profile: PublicProfile;
}

// ========== Site Content (admin-managed copy) ==========

export interface WhatWeDoItem {
  title: string;
  description: string;
}

export interface AboutContent {
  tagline: string;
  home_intro: string;
  intro: string[];
  mission: string;
  vision: string;
  what_we_do: WhatWeDoItem[];
  repertoire_intro: string;
  repertoire: string[];
  services: string;
  join_us: string;
  arms: string[];
  management_units: string[];
}

export interface ContactContent {
  tagline: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  description: string;
  digital_services_intro: string;
  digital_services: string[];
}

export interface LinksContent {
  music_scores_url: string;
}

export interface SiteContentMap {
  about: AboutContent;
  contact: ContactContent;
  links: LinksContent;
}

export type SiteContentKey = keyof SiteContentMap;

export interface Performance {
  id: string;
  title: string;
  performed_on: string;
  location: string | null;
  image_url: string;
  image_blur_data: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

// ========== Attendance Types ==========

export type AttendanceStatus = "present" | "absent_with_permission" | "absent";

export interface AttendanceSession {
  id: string;
  session_date: string;
  title: string;
  event_id: string | null;
  has_timestamp: boolean;
  taken_by: string;
  signature: string;
  created_at: string;
  taker?: Pick<Profile, "first_name" | "last_name" | "photo_url"> | null;
  event?: Pick<Event, "id" | "title" | "slug"> | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id: string;
  status: AttendanceStatus;
  note: string | null;
  marked_at: string | null;
  member?: Pick<Profile, "id" | "first_name" | "last_name" | "photo_url" | "ensemble_arm" | "choir_part"> | null;
}

// ========== Article / Blog Types ==========

export type ArticleStatus = "draft" | "pending_review" | "published" | "rejected";
export type ArticleCategory =
  | "News"
  | "Music Education"
  | "Behind the Scenes"
  | "Entertainment"
  | "Gist"
  | "Gossip"
  | "Event Recap"
  | "Announcements";
export type ContentType = "article" | "poetry";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_blur_data: string | null;
  category: ArticleCategory;
  content_type: ContentType;
  is_rated_18: boolean;
  status: ArticleStatus;
  rejection_note: string | null;
  author_id: string;
  published_at: string | null;
  view_count: number;
  pen_name: string | null;
  pending_edit: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithAuthor extends Article {
  author: Pick<Profile, "first_name" | "last_name" | "photo_url">;
}

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string | null;
  guest_name: string | null;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: Pick<Profile, "first_name" | "last_name" | "photo_url"> | null;
  // Present only in the POST response to the guest author so they can store it locally
  guest_token?: string;
}

// ========== Grant Opportunity Types ==========

export type GrantStatus = "unread" | "read" | "interested" | "applied";

export interface GrantOpportunity {
  id: string;
  title: string;
  description: string | null;
  source_name: string;
  source_url: string;
  external_url: string;
  deadline: string | null;
  amount: string | null;
  status: GrantStatus;
  created_at: string;
  updated_at: string;
}

// ========== Compulsory Recital Types ==========

export type RecitalQueryStatus = "pending" | "booked" | "cleared";
export type RecitalBookingStatus = "scheduled" | "passed" | "failed";

export interface RecitalConfig {
  id: number;
  cutoff_date: string;
  pass_mark: number;
  max_per_day: number;
  booking_closed: boolean;
}

export interface RecitalQuery {
  id: string;
  profile_id: string;
  issued_by: string | null;
  issued_at: string;
  status: RecitalQueryStatus;
  cleared_at: string | null;
  profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "photo_url" | "ensemble_arm" | "choir_part">;
  latest_booking?: RecitalBooking | null;
}

export interface RecitalBooking {
  id: string;
  query_id: string;
  profile_id: string;
  recital_date: string;
  slot_number: number;
  chosen_piece: string;
  status: RecitalBookingStatus;
  score_diction: number | null;
  score_costume: number | null;
  score_vocal_production: number | null;
  score_accompaniment: number | null;
  score_expression: number | null;
  total_score: number;
  scored_by: string | null;
  scored_at: string | null;
  scorer_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "photo_url" | "ensemble_arm" | "choir_part">;
}

export interface RecitalDaySlotInfo {
  date: string;
  remaining: number;
  full: boolean;
}

export interface AuditionRegistration {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  physical_address: string;
  date_of_birth: string;
  audition_type: "voice" | "instrument";
  instrument_name?: string | null;
  voice_part?: string | null;
  tonic_solfa_score: number;
  staff_notation_score: number;
  photo_url: string;
  preferred_time: string;
  attestation: boolean;
  created_at: string;
}

// ========== Contact Form ==========

export type ContactStatus = "new" | "read" | "replied";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  read_at: string | null;
  created_at: string;
}

export interface ContactReply {
  id: string;
  message_id: string;
  body: string;
  direction: "outbound" | "inbound";
  from_email: string | null;
  sent_by: string | null;
  created_at: string;
  sender?: Pick<Profile, "first_name" | "last_name"> | null;
}

// ========== Newsletter ==========

export type SubscriberStatus = "subscribed" | "unsubscribed";

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string;
  status: SubscriberStatus;
  consent_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export type NewsletterKind = "newsletter" | "promotional";
export type NewsletterStatus = "draft" | "queued" | "sending" | "paused" | "sent" | "cancelled";

export interface Newsletter {
  id: string;
  subject: string;
  preheader: string | null;
  body_html: string;
  kind: NewsletterKind;
  status: NewsletterStatus;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_by: string | null;
  queued_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailLogStatus = "queued" | "sent" | "failed" | "unknown";

export interface EmailLogEntry {
  id: string;
  kind: string;
  to_email: string;
  from_email: string | null;
  subject: string;
  status: EmailLogStatus;
  status_code: number | null;
  error: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}
