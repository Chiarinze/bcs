export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  slug: string;
  location?: string;
  is_paid: boolean;
  price?: number | null;
  image_url?: string | null;
  image_blur_data?: string | null;
  created_at?: string;
  is_internal?: boolean;
  event_type?: "standard" | "internal" | "audition";
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

export type MembershipStatus = "full_member" | "probationary";
export type EnsembleArm = "choir" | "orchestra";
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
  created_at: string;
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

// ========== Article / Blog Types ==========

export type ArticleStatus = "draft" | "pending_review" | "published";
export type ArticleCategory =
  | "News"
  | "Music Education"
  | "Behind the Scenes"
  | "Event Recap"
  | "Announcements";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_blur_data: string | null;
  category: ArticleCategory;
  status: ArticleStatus;
  rejection_note: string | null;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithAuthor extends Article {
  author: Pick<Profile, "first_name" | "last_name" | "photo_url">;
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
