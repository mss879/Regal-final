"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { friendlyError, type EnquiryStatus } from "@/lib/admin/types";

type Result = { ok: true; leadId?: string } | { ok: false; error: string };

const id = z.uuid();

export async function moveEnquiryToCrm(enquiryId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!id.safeParse(enquiryId).success) return { ok: false, error: "Invalid request." };
  const { data, error } = await supabase.rpc("move_enquiry_to_crm", { p_enquiry: enquiryId });
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true, leadId: data as string };
}

export async function setEnquiryStatus(enquiryId: string, status: EnquiryStatus): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!id.safeParse(enquiryId).success || !["new", "read", "archived"].includes(status)) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("enquiries").update({ status }).eq("id", enquiryId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteEnquiry(enquiryId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!id.safeParse(enquiryId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("enquiries").delete().eq("id", enquiryId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}
