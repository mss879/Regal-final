import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { friendlyError, type ChatLine, type WhatsAppLine } from "@/lib/admin/types";

// Reads for the live chat consoles, served by the /admin/api route handlers. They are plain
// GET requests rather than Server Actions, so polling never sits in the router's queue.

type Db = Awaited<ReturnType<typeof createClient>>;

const uuid = z.uuid();
const CHAT_LIMIT = 500;
const WHATSAPP_HISTORY = 200;

export type ChatThread = { ok: true; lines: ChatLine[]; aiPaused: boolean; visitorSeenAt: string | null } | { ok: false; error: string };

/** Messages in a website chat after a message id (0 = the whole chat), plus its AI/visitor state. */
export async function loadChatThread(supabase: Db, sessionId: string, afterId: number): Promise<ChatThread> {
  if (!uuid.safeParse(sessionId).success || !Number.isSafeInteger(afterId) || afterId < 0) return { ok: false, error: "Invalid request." };
  const [lines, session] = await Promise.all([
    supabase.from("chat_messages").select("id, role, content, created_at").eq("session_id", sessionId).gt("id", afterId).order("id").limit(CHAT_LIMIT),
    supabase.from("chat_sessions").select("ai_paused, visitor_seen_at").eq("id", sessionId).maybeSingle(),
  ]);
  if (lines.error || session.error) return { ok: false, error: friendlyError(lines.error?.message ?? session.error?.message) };
  if (!session.data) return { ok: false, error: "This chat no longer exists." };
  return { ok: true, lines: (lines.data ?? []) as ChatLine[], aiPaused: session.data.ai_paused, visitorSeenAt: session.data.visitor_seen_at };
}

export type WhatsAppThread =
  | { ok: true; lines: WhatsAppLine[]; lastInboundAt: string | null; aiPausedUntil: string | null }
  | { ok: false; error: string };

/** The latest messages in a WhatsApp conversation, oldest first. Marks it as read. */
export async function loadWhatsAppThread(supabase: Db, conversationId: string): Promise<WhatsAppThread> {
  if (!uuid.safeParse(conversationId).success) return { ok: false, error: "Invalid request." };
  const [lines, conversation] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select("id, direction, message_type, content, status, error, sent_by, created_at")
      .eq("conversation_id", conversationId)
      .order("id", { ascending: false })
      .limit(WHATSAPP_HISTORY),
    supabase.from("whatsapp_conversations").select("last_inbound_at, unread_count, ai_paused_until").eq("id", conversationId).maybeSingle(),
  ]);
  if (lines.error || conversation.error) return { ok: false, error: friendlyError(lines.error?.message ?? conversation.error?.message) };
  if (!conversation.data) return { ok: false, error: "This conversation no longer exists." };
  if (conversation.data.unread_count > 0) await supabase.rpc("mark_whatsapp_read", { p_conversation: conversationId });
  return {
    ok: true,
    lines: ((lines.data ?? []) as WhatsAppLine[]).reverse(),
    lastInboundAt: conversation.data.last_inbound_at,
    aiPausedUntil: conversation.data.ai_paused_until,
  };
}
