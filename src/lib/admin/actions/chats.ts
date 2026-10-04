"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { friendlyError, type ActionResult, type ChatLine } from "@/lib/admin/types";

const uuid = z.uuid();

/** Deletes a conversation and its messages. A linked enquiry is kept. */
export async function deleteChat(sessionId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  refresh();
  return { ok: true };
}

export type ChatUpdate = { ok: true; lines: ChatLine[]; aiPaused: boolean; visitorSeenAt: string | null } | { ok: false; error: string };

/** New messages in a chat since a message id, plus its AI/visitor state (polled by the live console). */
export async function getChatUpdates(sessionId: string, afterId: number): Promise<ChatUpdate> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(sessionId).success || !Number.isSafeInteger(afterId)) return { ok: false, error: "Invalid request." };
  const [lines, session] = await Promise.all([
    supabase.from("chat_messages").select("id, role, content, created_at").eq("session_id", sessionId).gt("id", afterId).order("id").limit(100),
    supabase.from("chat_sessions").select("ai_paused, visitor_seen_at").eq("id", sessionId).maybeSingle(),
  ]);
  if (lines.error || session.error) return { ok: false, error: friendlyError(lines.error?.message ?? session.error?.message) };
  if (!session.data) return { ok: false, error: "This chat no longer exists." };
  return { ok: true, lines: (lines.data ?? []) as ChatLine[], aiPaused: session.data.ai_paused, visitorSeenAt: session.data.visitor_seen_at };
}

/** A staff reply. It appears in the visitor's chat window within a few seconds and switches the AI off. */
export async function sendChatReply(sessionId: string, content: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const text = content.trim();
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Invalid request." };
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > 4000) return { ok: false, error: "Please keep replies under 4,000 characters." };
  const { error } = await supabase.rpc("send_chat_reply", { p_session: sessionId, p_content: text });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}

/** Switch the AI on or off for one chat. */
export async function setChatAi(sessionId: string, paused: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Invalid request." };
  const { error } = await supabase.rpc("set_chat_ai", { p_session: sessionId, p_paused: paused });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}
