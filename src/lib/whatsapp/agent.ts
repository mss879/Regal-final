import "server-only";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { INTEREST_KEYS } from "@/lib/enquiry";
import { LOTS } from "@/lib/lots";
import { SITE } from "@/lib/site";
import { MODEL, modelSettings } from "@/lib/chat/model";
import { buildWhatsAppPrompt } from "@/lib/chat/whatsapp-prompt";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { toWhatsAppText } from "@/lib/whatsapp/format";

// The AI agent on WhatsApp. It answers from the same facts as the website assistant, and its
// saveCallRequest tool creates an enquiry for the sales team. Staff can pause it per conversation.
const HISTORY = 20; // messages sent to the model
const DAILY_LIMIT = 60; // AI replies per conversation per day, to cap OpenAI costs
const FALLBACK = "Thank you for your message. One of our team will reply to you shortly.";

const LOT_IDS = LOTS.map((l) => l.id) as [string, ...string[]];
const PHONE = /^[+\d][\d\s()-]{6,}$/;

/** Replies to the customer's newest message, unless the AI is paused for this conversation. */
export async function answerOnWhatsApp(contactId: string, inboundId: number) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return console.error("[whatsapp] OPENAI_API_KEY is not set.");

  const db = createServiceClient();
  const { data: conversation } = await db
    .from("whatsapp_conversations")
    .select("id, profile_name, ai_paused_until")
    .eq("contact_id", contactId)
    .maybeSingle();
  if (!conversation) return;
  if (conversation.ai_paused_until && new Date(conversation.ai_paused_until).getTime() > Date.now()) return;

  const { data: allowed } = await db.rpc("check_rate_limit", {
    p_bucket: "whatsapp-ai",
    p_key: conversation.id,
    p_limit: DAILY_LIMIT,
    p_window: "24 hours",
  });
  if (allowed === false) return;

  const number = /^\d+$/.test(contactId) ? `+${contactId}` : null;

  const saveCallRequest = tool({
    description:
      "Save the customer's request for a phone call from the sales team. It appears in the admin Enquiries inbox. Only call once you have their name, the best time to contact them, and they have confirmed which number to use. Call again to change details; it updates the same request.",
    inputSchema: z.object({
      name: z.string().min(2).max(120).describe("The customer's name"),
      customerGaveTime: z.boolean().describe("True only if the customer themselves told you when to contact them"),
      customerConfirmedNumber: z.boolean().describe("True only if the customer answered which number to use"),
      useWhatsAppNumber: z.boolean().describe("True if they said to contact them on this WhatsApp number"),
      phone: z.string().max(40).optional().describe("The other number they gave, if they prefer a different one"),
      preferredTime: z.string().min(2).max(120).describe('Best time to contact them, in their words, with the date worked out, e.g. "Tuesday 4 Nov after 5pm"'),
      lot: z.enum(["any", ...LOT_IDS]).optional().describe('Lot id of the villa of interest: e.g. "9" = Lot 09, "14-15" = Lot 14 & 15, or "any"'),
      interest: z.enum(INTEREST_KEYS).describe("prebook, site_visit, pricing or other"),
      summary: z.string().max(600).optional().describe("One sentence on what they want to discuss"),
    }),
    execute: async (input) => {
      if (!input.customerGaveTime) return { success: false, error: "missing_time", hint: "Ask for the best day and time to contact them." };
      if (!input.customerConfirmedNumber) return { success: false, error: "number_not_confirmed", hint: "Ask whether to use this WhatsApp number or another one." };
      const phone = input.useWhatsAppNumber ? number : input.phone?.trim();
      if (!phone) return { success: false, error: "missing_phone", hint: "Their WhatsApp number is hidden. Ask which number to use." };
      if (!PHONE.test(phone)) return { success: false, error: "invalid_phone", hint: "Ask them to check the number." };

      const { data, error } = await db.rpc("save_whatsapp_enquiry", {
        p_conversation: conversation.id,
        p_name: input.name,
        p_phone: phone,
        p_lot: input.lot ?? null,
        p_interest: input.interest,
        p_message: [`Call back: ${input.preferredTime}, on ${phone}.`, input.summary].filter(Boolean).join(" "),
      });
      if (error || !data?.ok) {
        console.error("[whatsapp] saveCallRequest failed:", error?.message ?? data);
        return { success: false, error: "save_failed", hint: `Apologise and give our phone (${SITE.phone}) and email (${SITE.email}).` };
      }
      return { success: true, updated: Boolean(data.updated), phone, preferredTime: input.preferredTime };
    },
  });

  const { data: saved } = await db
    .from("whatsapp_messages")
    .select("direction, sent_by, content")
    .eq("conversation_id", conversation.id)
    .order("id", { ascending: false })
    .limit(HISTORY);
  const history: ModelMessage[] = (saved ?? []).reverse().map((m) =>
    m.direction === "in"
      ? { role: "user" as const, content: m.content }
      : { role: "assistant" as const, content: m.sent_by === "staff" ? `[Reply from a member of the sales team] ${m.content}` : m.content },
  );

  let reply = FALLBACK;
  try {
    const result = await generateText({
      model: createOpenAI({ apiKey }).chat(MODEL),
      system: buildWhatsAppPrompt({ number, profileName: conversation.profile_name }),
      messages: history,
      tools: { saveCallRequest },
      // 1 model call + tool execution + final reply (+1 spare for a corrected tool call).
      stopWhen: stepCountIs(4),
      ...modelSettings(MODEL),
      maxOutputTokens: 500,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20_000),
    });
    reply = toWhatsAppText(result.text) || FALLBACK;
  } catch (err) {
    console.error("[whatsapp] generation failed:", err instanceof Error ? err.message : err);
  }

  // If the customer sent something else meanwhile, that message's reply will cover both.
  const { data: latest } = await db
    .from("whatsapp_messages")
    .select("id")
    .eq("conversation_id", conversation.id)
    .eq("direction", "in")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest && latest.id !== inboundId) return;

  const sent = await sendWhatsAppText(contactId, reply);
  if (!sent.ok) return console.error("[whatsapp] AI reply not sent:", sent.error);
  const { error } = await db.rpc("log_whatsapp_ai_reply", { p_conversation: conversation.id, p_wamid: sent.wamid, p_content: reply });
  if (error) console.error("[whatsapp] AI reply sent but not saved:", error.message);
}
