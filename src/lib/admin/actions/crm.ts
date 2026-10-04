"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { INTEREST_KEYS } from "@/lib/enquiry";
import { friendlyError, LEAD_SOURCES, STAGE_COLORS, type ActionResult } from "@/lib/admin/types";

const uuid = z.uuid();
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

// ---------------------------------------------------------------- leads
const leadSchema = z.object({
  id: z.union([uuid, z.literal("")]),
  stage_id: uuid,
  name: z.string().trim().min(1, "Please add a name.").max(120),
  email: z.union([z.email("Please check the email address."), z.literal("")]).transform((v) => v || null),
  phone: optionalText(40),
  lot: optionalText(20),
  interest: z.union([z.enum(INTEREST_KEYS), z.literal("")]).transform((v) => v || null),
  source: z.enum(LEAD_SOURCES.map((s) => s.key) as [string, ...string[]]),
  value: z
    .string()
    .trim()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .refine((v) => v === "" || /^\d{1,14}$/.test(v), "Value should be a whole number of rupees.")
    .transform((v) => (v === "" ? null : Number(v))),
  notes: optionalText(5000),
});

export type LeadFormState = { ok?: boolean; error?: string; fields?: Record<string, string> };

export async function saveLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const { supabase } = await requireAdmin();
  const fields = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = leadSchema.safeParse({ ...fields, email: (fields.email ?? "").trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form.", fields };
  const { id, stage_id, ...row } = parsed.data;

  if (id) {
    const { data: current, error: readError } = await supabase.from("leads").select("stage_id").eq("id", id).single();
    if (readError) return { error: friendlyError(readError.message), fields };
    const { error } = await supabase.from("leads").update(row).eq("id", id);
    if (error) return { error: friendlyError(error.message), fields };
    // Changing the stage in the form moves the card to the top of its new column.
    if (current.stage_id !== stage_id) {
      const { error: moveError } = await supabase.rpc("move_lead", { p_lead: id, p_stage: stage_id, p_index: 0 });
      if (moveError) return { error: friendlyError(moveError.message), fields };
    }
  } else {
    const { error } = await supabase.from("leads").insert({ ...row, stage_id });
    if (error) return { error: friendlyError(error.message), fields };
  }
  refresh();
  return { ok: true };
}

export async function moveLead(leadId: string, stageId: string, index: number): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(leadId).success || !uuid.safeParse(stageId).success || !Number.isInteger(index) || index < 0) {
    return { ok: false, error: "Invalid move." };
  }
  const { error } = await supabase.rpc("move_lead", { p_lead: leadId, p_stage: stageId, p_index: index });
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(leadId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- stages
const stageSchema = z.object({
  name: z.string().trim().min(1, "Please name the stage.").max(40, "Stage names can be up to 40 characters."),
  color: z.enum(STAGE_COLORS as [string, ...string[]]),
  kind: z.enum(["open", "won", "lost"]),
});

export async function createStage(input: { name: string; color: string; kind: string }): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid stage." };
  const { error } = await supabase.from("pipeline_stages").insert(parsed.data);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export async function updateStage(stageId: string, input: { name: string; color: string; kind: string }): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = stageSchema.safeParse(input);
  if (!uuid.safeParse(stageId).success || !parsed.success) {
    return { ok: false, error: parsed.success ? "Invalid request." : (parsed.error.issues[0]?.message ?? "Invalid stage.") };
  }
  // The built-in stage only accepts a colour change (the database enforces this too).
  const { data: stage } = await supabase.from("pipeline_stages").select("is_system").eq("id", stageId).single();
  const patch = stage?.is_system ? { color: parsed.data.color } : parsed.data;
  const { error } = await supabase.from("pipeline_stages").update(patch).eq("id", stageId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export async function reorderStages(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.array(uuid).max(50).safeParse(ids).success) return { ok: false, error: "Invalid order." };
  const { error } = await supabase.rpc("reorder_stages", { p_ids: ids });
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteStage(stageId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(stageId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.rpc("delete_stage", { p_stage: stageId });
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}
