"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime, formatTime, fromColombo } from "@/lib/time";
import { friendlyError, type ActionResult, type ViewingStatus } from "@/lib/admin/types";

export type ViewingFormState = { ok?: boolean; error?: string; warning?: string; fields?: Record<string, string> };

const STATUSES = ["requested", "confirmed", "completed", "cancelled", "no_show"] as const;
const optionalUuid = z.union([z.uuid(), z.literal("")]);

const schema = z.object({
  id: optionalUuid,
  lead_id: optionalUuid,
  enquiry_id: optionalUuid,
  name: z.string().trim().min(1, "Please add a name.").max(120),
  email: z.union([z.email("Please check the email address."), z.literal("")]),
  phone: z.string().trim().max(40),
  lot: z.string().trim().max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a time."),
  duration_minutes: z.coerce.number().int().min(15).max(480),
  status: z.enum(STATUSES),
  notes: z.string().trim().max(2000),
});

export async function saveViewing(_prev: ViewingFormState, formData: FormData): Promise<ViewingFormState> {
  const { supabase } = await requireAdmin();
  const fields = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse({ ...fields, email: (fields.email ?? "").trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form.", fields };
  const d = parsed.data;

  const starts = fromColombo(d.date, d.time);
  if (Number.isNaN(starts.getTime())) return { error: "Please choose a valid date and time.", fields };
  const ends = new Date(starts.getTime() + d.duration_minutes * 60_000);

  // Warn (once) about clashes with other active viewings.
  if (!fields.force && (d.status === "requested" || d.status === "confirmed")) {
    let q = supabase
      .from("viewings")
      .select("name, starts_at")
      .in("status", ["requested", "confirmed"])
      .lt("starts_at", ends.toISOString())
      .gt("ends_at", starts.toISOString())
      .limit(1);
    if (d.id) q = q.neq("id", d.id);
    const { data: clash } = await q;
    if (clash?.length) {
      return {
        warning: `This overlaps a viewing with ${clash[0].name} at ${formatTime(clash[0].starts_at)} (${formatDateTime(clash[0].starts_at)}).`,
        fields,
      };
    }
  }

  const row = {
    name: d.name,
    email: d.email || null,
    phone: d.phone || null,
    lot: d.lot || null,
    starts_at: starts.toISOString(),
    duration_minutes: d.duration_minutes,
    status: d.status,
    notes: d.notes || null,
    lead_id: d.lead_id || null,
    enquiry_id: d.enquiry_id || null,
  };
  const { error } = d.id
    ? await supabase.from("viewings").update(row).eq("id", d.id)
    : await supabase.from("viewings").insert(row);
  if (error) return { error: friendlyError(error.message), fields };

  refresh();
  return { ok: true };
}

export async function setViewingStatus(id: string, status: ViewingStatus): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success || !STATUSES.includes(status)) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("viewings").update({ status }).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteViewing(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("viewings").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}
