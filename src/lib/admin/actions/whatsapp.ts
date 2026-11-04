"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { friendlyError, type ActionResult, type WhatsAppConversation } from "@/lib/admin/types";
import { sendWhatsAppText } from "@/lib/whatsapp/send";

const uuid = z.uuid();
const REPLY_WINDOW = 24 * 60 * 60 * 1000;

/** Deletes a conversation and its messages from the website. WhatsApp itself is not affected. */
export async function deleteWhatsAppChat(conversationId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(conversationId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("whatsapp_conversations").delete().eq("id", conversationId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

/** Switch the AI on, or off for the next 8 hours, for one conversation. */
export async function setWhatsAppAi(conversationId: string, on: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(conversationId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.rpc("set_whatsapp_ai", { p_conversation: conversationId, p_on: on });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}

/** A staff reply: sent through WhatsApp first, then saved once WhatsApp has accepted it. It also pauses the AI. */
export async function sendWhatsAppReply(conversationId: string, content: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const text = content.trim();
  if (!uuid.safeParse(conversationId).success) return { ok: false, error: "Invalid request." };
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > 4000) return { ok: false, error: "Please keep replies under 4,000 characters." };

  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("contact_id, last_inbound_at")
    .eq("id", conversationId)
    .maybeSingle<Pick<WhatsAppConversation, "contact_id" | "last_inbound_at">>();
  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) return { ok: false, error: "This conversation no longer exists." };
  if (!data.last_inbound_at || Date.now() - new Date(data.last_inbound_at).getTime() > REPLY_WINDOW) {
    return { ok: false, error: "WhatsApp's 24-hour reply window for this customer has closed." };
  }

  const sent = await sendWhatsAppText(data.contact_id, text);
  if (!sent.ok) return sent;

  const logged = await supabase.rpc("log_whatsapp_reply", { p_conversation: conversationId, p_wamid: sent.wamid, p_content: text });
  if (logged.error) {
    console.error("[whatsapp] reply sent but not saved:", logged.error.message);
    return { ok: false, error: "The message was sent, but it couldn't be saved here." };
  }
  return { ok: true };
}
