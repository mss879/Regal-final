"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { friendlyError, type ActionResult } from "@/lib/admin/types";

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
