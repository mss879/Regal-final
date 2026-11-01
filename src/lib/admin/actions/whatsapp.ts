"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { friendlyError, type ActionResult, type WhatsAppConversation, type WhatsAppLine } from "@/lib/admin/types";
import { sendWhatsAppText } from "@/lib/whatsapp/send";

const uuid = z.uuid();
const HISTORY = 200;
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

export type WhatsAppUpdate = { ok: true; lines: WhatsAppLine[]; lastInboundAt: string | null } | { ok: false; error: string };

/** The latest messages in a conversation (polled by the live console). Marks it as read. */
export async function getWhatsAppUpdates(conversationId: string): Promise<WhatsAppUpdate> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(conversationId).success) return { ok: false, error: "Invalid request." };
  const [lines, conversation] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select("id, direction, message_type, content, status, error, created_at")
      .eq("conversation_id", conversationId)
      .order("id", { ascending: false })
      .limit(HISTORY),
    supabase.from("whatsapp_conversations").select("last_inbound_at, unread_count").eq("id", conversationId).maybeSingle(),
  ]);
  if (lines.error || conversation.error) return { ok: false, error: friendlyError(lines.error?.message ?? conversation.error?.message) };
  if (!conversation.data) return { ok: false, error: "This conversation no longer exists." };
  if (conversation.data.unread_count > 0) await supabase.rpc("mark_whatsapp_read", { p_conversation: conversationId });
  return { ok: true, lines: ((lines.data ?? []) as WhatsAppLine[]).reverse(), lastInboundAt: conversation.data.last_inbound_at };
}

/** A staff reply: sent through WhatsApp first, then saved once WhatsApp has accepted it. */
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
