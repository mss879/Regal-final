import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseWebhook, validSignature } from "@/lib/whatsapp/webhook";

// GET  /api/whatsapp/webhook — Meta's one-time check when the callback URL is saved.
// POST /api/whatsapp/webhook — customer messages and delivery updates from the Cloud API.
// Requests are only trusted if they carry a valid signature made with the app secret. A failed
// database write returns 500 so Meta sends the event again; repeats are ignored by wamid.
const MAX_BODY = 1_000_000;

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const challenge = q.get("hub.challenge");
  if (!env.whatsappVerifyToken || q.get("hub.mode") !== "subscribe" || q.get("hub.verify_token") !== env.whatsappVerifyToken || !challenge) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(challenge, { headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: NextRequest) {
  if (!env.whatsappAppSecret || !env.whatsappPhoneNumberId || !env.supabaseUrl || !env.supabaseSecretKey) {
    return new Response("Not configured", { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response("Too large", { status: 413 });
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), env.whatsappAppSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = createServiceClient();
  for (const event of parseWebhook(body, env.whatsappPhoneNumberId)) {
    const { error } =
      event.kind === "message"
        ? await supabase.rpc("log_whatsapp_inbound", {
            p_contact: event.contactId,
            p_bsuid: event.bsuid,
            p_name: event.name,
            p_wamid: event.wamid,
            p_type: event.type,
            p_content: event.content,
            p_sent_at: event.sentAt,
          })
        : await supabase.rpc("update_whatsapp_status", { p_wamid: event.wamid, p_status: event.status, p_error: event.error });
    if (error) {
      console.error("[whatsapp] webhook write failed:", error.message);
      return new Response("Write failed", { status: 500 });
    }
  }

  return new Response("OK");
}
