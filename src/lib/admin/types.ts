// Row shapes returned by Supabase for the admin (see supabase/migrations).
export type EnquiryStatus = "new" | "read" | "archived";
export type Enquiry = {
  id: string;
  name: string;
  /** Chat enquiries may have only a phone number. */
  email: string | null;
  phone: string | null;
  lot: string | null;
  interest: string;
  message: string | null;
  preferred_viewing_at: string | null;
  source_path: string | null;
  status: EnquiryStatus;
  lead_id: string | null;
  channel: "form" | "chat";
  chat_session_id: string | null;
  created_at: string;
};

export type ChatSession = {
  id: string;
  started_path: string | null;
  message_count: number;
  enquiry_id: string | null;
  /** Human takeover: the AI doesn't answer while true. */
  ai_paused: boolean;
  last_role: "user" | "assistant" | "agent" | null;
  visitor_seen_at: string | null;
  created_at: string;
  last_message_at: string;
};

/** user = visitor, assistant = the AI, agent = staff. */
export type ChatLine = { id: number; role: "user" | "assistant" | "agent"; content: string; created_at: string };

export type StageColor = "lime" | "sage" | "leaf" | "moss" | "forest" | "sand" | "design" | "sold";
export type StageKind = "open" | "won" | "lost";
export type Stage = {
  id: string;
  name: string;
  color: StageColor;
  position: number;
  kind: StageKind;
  is_system: boolean;
};

export type LeadSource = "website" | "manual" | "phone" | "referral" | "walk_in" | "social" | "other";
export type Lead = {
  id: string;
  stage_id: string;
  position: number;
  name: string;
  email: string | null;
  phone: string | null;
  lot: string | null;
  interest: string | null;
  source: LeadSource;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ViewingStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
export type Viewing = {
  id: string;
  lead_id: string | null;
  enquiry_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  lot: string | null;
  starts_at: string;
  duration_minutes: number;
  ends_at: string;
  status: ViewingStatus;
  notes: string | null;
};

export type Activity = {
  id: number;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
  created_at: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export const STAGE_COLORS: StageColor[] = ["lime", "sage", "leaf", "moss", "forest", "sand", "design", "sold"];

export const LEAD_SOURCES: { key: LeadSource; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "walk_in", label: "Walk-in" },
  { key: "referral", label: "Referral" },
  { key: "social", label: "Social media" },
  { key: "manual", label: "Added by staff" },
  { key: "other", label: "Other" },
];

export const VIEWING_STATUSES: { key: ViewingStatus; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-show" },
];

export const viewingStatusLabel = (s: ViewingStatus) => VIEWING_STATUSES.find((v) => v.key === s)?.label ?? s;

/** Supabase/Postgres error text that is safe and useful to show staff. */
export function friendlyError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (/built in|cannot be deleted|cannot be renamed|system stage/i.test(message)) return message.replace(/^.*?: /, "");
  if (/not authorised|row-level security|permission denied/i.test(message)) return "You don't have permission to do that.";
  if (/violates check constraint/i.test(message)) return "Some of the details aren't valid — please check the form.";
  return "Something went wrong. Please try again.";
}
