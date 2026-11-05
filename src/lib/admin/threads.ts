import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { friendlyError, type ChatLine } from "@/lib/admin/types";

// Reads for the live chat console, served by the /admin/api route handlers. They are plain
// GET requests rather than Server Actions, so polling never sits in the router's queue.

type Db = Awaited<ReturnType<typeof createClient>>;

const uuid = z.uuid();
const CHAT_LIMIT = 500;

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
