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
