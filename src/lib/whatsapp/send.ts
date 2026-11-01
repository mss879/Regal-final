import "server-only";
import { env } from "@/lib/env";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

// Messages staff can act on. Anything else falls back to a general error.
const ERRORS: Record<number, string> = {
  131047: "WhatsApp's 24-hour reply window for this customer has closed.",
  131026: "This customer can't receive WhatsApp messages at the moment.",
  131031: "WhatsApp has restricted this account. Check WhatsApp Manager.",
  190: "The WhatsApp access token has expired or is wrong.",
};

export type SendResult = { ok: true; wamid: string } | { ok: false; error: string };

/** Sends a plain text message through the WhatsApp Cloud API. */
export async function sendWhatsAppText(contactId: string, body: string): Promise<SendResult> {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) return { ok: false, error: "WhatsApp isn't connected yet." };

  // Digits are a phone number; anything else is a business-scoped user ID.
  const recipient = /^\d+$/.test(contactId) ? { to: contactId } : { recipient: contactId };
  let res: Response;
  try {
    res = await fetch(`${GRAPH_URL}/${env.whatsappPhoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.whatsappAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...recipient, type: "text", text: { preview_url: false, body } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "Couldn't reach WhatsApp. Please try again." };
  }

  const data = (await res.json().catch(() => null)) as { messages?: { id?: string }[]; error?: { code?: number } } | null;
  const wamid = data?.messages?.[0]?.id;
  if (res.ok && wamid) return { ok: true, wamid };

  const code = data?.error?.code;
  console.error("[whatsapp] send failed:", res.status, code);
  return { ok: false, error: (code && ERRORS[code]) || "WhatsApp didn't accept this message. Please try again." };
}
