import { NextResponse, type NextRequest } from "next/server";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { env, writesConfigured } from "@/lib/env";
import { LOTS } from "@/lib/lots";
import { SITE } from "@/lib/site";
import { INTEREST_KEYS } from "@/lib/enquiry";
import { buildSystemPrompt } from "@/lib/chat/knowledge";
import { clientIp, hashKey } from "@/lib/analytics/hash";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatDateTime, fromColombo } from "@/lib/time";

// POST /api/chat — the website's AI assistant (Vercel AI SDK v6 + OpenAI).
//   Body: { sessionId, path, messages: [{ role, content }] }
//   →     { content, saved, lastId, aiPaused }   (content is null while staff have taken over)
// GET /api/chat?session=<id>&after=<messageId> — the widget polling for staff/AI replies.
// Every visitor and AI message is saved to Supabase before the response is sent. The model can
// call saveEnquiry, which writes to Enquiries (+ Viewings) in /admin.
export const maxDuration = 30;

// gpt-6-luna: OpenAI's most efficient model for focused, high-volume tasks ($0.10 / $0.50 per 1M
// tokens in / out — cheaper than gpt-4o-mini). Override with OPENAI_MODEL.
const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-6-luna";

// Reasoning models take a reasoning effort instead of a temperature. "none" keeps replies fast,
// and gpt-6-luna only supports tool calling on Chat Completions with reasoning set to "none".
function modelSettings(model: string) {
  if (!/^(gpt-([5-9]|\d{2})|o\d)/.test(model)) return { temperature: 0.4 };
  const effort = /^gpt-5(-|$)/.test(model) ? "minimal" : /^o\d/.test(model) || (/^gpt-6/.test(model) && !/^gpt-6-(luna|sol)$/.test(model)) ? "low" : "none";
  return { providerOptions: { openai: { reasoningEffort: effort } } };
}
const MAX_BODY = 64_000;
const HISTORY = 16; // messages sent to the model
const HOUR = 3_600_000;
const FALLBACK = `Sorry — I can't answer right now. Please call us on ${SITE.phone} or email ${SITE.email}, or use the [enquiry form](/contact).`;

const bodySchema = z.object({
  sessionId: z.uuid(),
  path: z.string().max(300).optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(80),
});

const LOT_IDS = LOTS.map((l) => l.id) as [string, ...string[]];
const PHONE = /^[+\d][\d\s()-]{6,}$/;

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

function crossSite(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return Boolean((fetchSite && fetchSite !== "same-origin") || (origin && host && new URL(origin).host !== host));
}

type Logged = { id: number; paused: boolean | null };

export async function GET(request: NextRequest) {
  if (crossSite(request)) return json({ error: "Forbidden" }, 403);
  const session = request.nextUrl.searchParams.get("session") ?? "";
  const after = Number(request.nextUrl.searchParams.get("after") ?? 0);
  if (!z.uuid().safeParse(session).success || !Number.isSafeInteger(after) || after < 0) return json({ error: "Bad request" }, 400);
  if (!writesConfigured()) return json({ aiPaused: false, messages: [] });
  const { data, error } = await createServiceClient().rpc("chat_poll", { p_session: session, p_after: after });
  if (error) {
    console.error("[chat] poll failed:", error.message);
    return json({ aiPaused: false, messages: [] });
  }
  return json({ aiPaused: Boolean(data?.paused), messages: data?.messages ?? [] });
}

export async function POST(request: NextRequest) {
  // Same-origin only: this endpoint spends OpenAI credit.
  if (crossSite(request)) return json({ error: "Forbidden" }, 403);

  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: "Too long" }, 413);
  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(text));
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!parsed.success) return json({ error: "Bad request" }, 400);
  const { sessionId, messages } = parsed.data;
  const path = parsed.data.path?.startsWith("/") ? parsed.data.path : undefined;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return json({ error: "Bad request" }, 400);
  if (last.content.length > 1500) {
    return json({ content: "That's a long message — could you shorten it a little (under 1,500 characters)?", saved: false });
  }

  const ip = clientIp(request.headers);
  const db = writesConfigured() ? createServiceClient() : null;

  // Cost and abuse limits: 20 messages per 10 minutes per visitor, 80 per chat per day.
  if (db) {
    const [perVisitor, perSession] = await Promise.all([
      db.rpc("check_rate_limit", { p_bucket: "chat", p_key: hashKey(env.analyticsSalt!, "chat", ip ?? sessionId), p_limit: 20, p_window: "10 minutes" }),
      db.rpc("check_rate_limit", { p_bucket: "chat-session", p_key: sessionId, p_limit: 80, p_window: "24 hours" }),
    ]);
    if (perVisitor.data === false || perSession.data === false) {
      return json({ content: `You've sent a lot of messages in a short time — please wait a few minutes, or call us on ${SITE.phone}.`, saved: false }, 429);
    }
  }

  // Save the visitor's message first, so every conversation is kept even if the AI fails.
  const log = async (role: "user" | "assistant", content: string): Promise<Logged | null> => {
    if (!db) return null;
    const { data, error } = await db.rpc("log_chat_message", { p_session: sessionId, p_role: role, p_content: content, p_path: path ?? null });
    if (error) {
      console.error(`[chat] could not save the ${role} message:`, error.message);
      return null;
    }
    return data as Logged;
  };
  const userLog = await log("user", last.content);

  // A member of staff has taken over: no AI reply, they answer from /admin/chats.
  if (userLog?.paused) {
    return json({ content: null, saved: false, lastId: userLog.id, aiPaused: true });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[chat] OPENAI_API_KEY is not set.");
    const fallbackLog = await log("assistant", FALLBACK);
    return json({ content: FALLBACK, saved: false, lastId: fallbackLog?.id ?? userLog?.id ?? null, aiPaused: false }, 503);
  }

  let saved = false;
  const saveEnquiry = tool({
    description:
      "Save the visitor's contact details and request for the sales team (it appears in the admin Enquiries inbox, and on the viewings calendar if a time is given). Only call after the visitor has given their name plus an email or phone number and agreed to be contacted. Call again to add or change details — it updates the same enquiry.",
    inputSchema: z.object({
      name: z.string().min(2).max(120).describe("The visitor's full name"),
      email: z.string().max(254).optional().describe("Email address, if given"),
      phone: z.string().max(40).optional().describe("Phone or WhatsApp number (with country code if given)"),
      lot: z.enum(["any", ...LOT_IDS]).optional().describe('Lot id of the villa of interest: e.g. "9" = Lot 09, "14-15" = Lot 14 & 15, or "any"'),
      interest: z.enum(INTEREST_KEYS).describe("prebook, site_visit, pricing or other"),
      message: z.string().max(1000).optional().describe("One-sentence summary of what the visitor wants"),
      visitDate: z.string().optional().describe("Preferred viewing date, YYYY-MM-DD, Sri Lanka time"),
      visitTime: z.string().optional().describe("Preferred viewing time, HH:MM 24-hour, Sri Lanka time"),
    }),
    execute: async (input) => {
      const email = input.email?.trim() || undefined;
      const phone = input.phone?.trim() || undefined;
      if (email && !z.email().safeParse(email).success) return { success: false, error: "invalid_email", hint: "Ask the visitor to check their email address." };
      if (phone && !PHONE.test(phone)) return { success: false, error: "invalid_phone", hint: "Ask the visitor to check their phone number." };
      if (!email && !phone) return { success: false, error: "missing_contact", hint: "Ask for an email address or phone number first." };

      let visitAt: Date | null = null;
      if (input.visitDate || input.visitTime) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitDate ?? "") || !/^\d{2}:\d{2}$/.test(input.visitTime ?? "")) {
          return { success: false, error: "invalid_time", hint: "Ask for both a date and a time for the viewing." };
        }
        visitAt = fromColombo(input.visitDate!, input.visitTime!);
        const ahead = visitAt.getTime() - Date.now();
        if (Number.isNaN(ahead) || ahead < 12 * HOUR || ahead > 180 * 24 * HOUR) {
          return { success: false, error: "invalid_time", hint: "Viewings must be at least a day ahead and within six months. Ask for another time." };
        }
      }

      if (!db) return { success: false, error: "not_configured", hint: `Give the visitor our phone (${SITE.phone}) and email (${SITE.email}).` };
      const { data, error } = await db.rpc("save_chat_enquiry", {
        p_session: sessionId,
        p_name: input.name,
        p_email: email ?? null,
        p_phone: phone ?? null,
        p_lot: input.lot ?? null,
        p_interest: input.interest,
        p_message: input.message ?? null,
        p_preferred_viewing_at: visitAt?.toISOString() ?? null,
        p_rate_key: hashKey(env.analyticsSalt!, "chat-enquiry", ip ?? sessionId),
      });
      if (error || !data?.ok) {
        console.error("[chat] saveEnquiry failed:", error?.message ?? data);
        return { success: false, error: data?.error ?? "save_failed", hint: `Apologise and give our phone (${SITE.phone}) and email (${SITE.email}).` };
      }
      saved = true;
      return { success: true, updated: Boolean(data.updated), viewingRequested: visitAt ? `${formatDateTime(visitAt)} (Sri Lanka time)` : null };
    },
  });

  // Conversation history: from the saved transcript when available (so staff replies are included
  // and the browser can't rewrite it), otherwise from the request.
  let history: ModelMessage[] = messages.slice(-HISTORY).map((m) => ({ role: m.role, content: m.content }));
  if (db && userLog) {
    const { data: saved } = await db
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("id", { ascending: false })
      .limit(HISTORY);
    if (saved?.length) {
      history = saved.reverse().map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.content }
          : { role: "assistant" as const, content: m.role === "agent" ? `[Reply from a member of the sales team] ${m.content}` : m.content },
      );
    }
  }
  let content = FALLBACK;
  try {
    const openai = createOpenAI({ apiKey });
    const result = await generateText({
      model: openai.chat(MODEL),
      system: buildSystemPrompt(),
      messages: history,
      tools: { saveEnquiry },
      // 1 model call + tool execution + final reply (+1 spare for a corrected tool call).
      stopWhen: stepCountIs(4),
      ...modelSettings(MODEL),
      maxOutputTokens: 700,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(25_000),
    });
    content = result.text.trim() || FALLBACK;
  } catch (err) {
    console.error("[chat] generation failed:", err instanceof Error ? err.message : err);
  }

  const replyLog = await log("assistant", content);
  return json({ content, saved, lastId: replyLog?.id ?? userLog?.id ?? null, aiPaused: Boolean(replyLog?.paused) });
}
