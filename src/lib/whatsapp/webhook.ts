import { createHmac, timingSafeEqual } from "node:crypto";

// Reading WhatsApp Cloud API webhooks. Kept free of server-only imports so the checks can be
// run on their own. Field reference: Meta's WhatsApp Business Platform webhook docs.

export type InboundEvent = {
  kind: "message";
  contactId: string;
  bsuid: string | null;
  name: string | null;
  wamid: string;
  type: string;
  content: string;
  sentAt: string;
};

export type StatusEvent = { kind: "status"; wamid: string; status: string; error: string | null };

export type WebhookEvent = InboundEvent | StatusEvent;

/** Checks Meta's X-Hub-Signature-256 header against the raw request body. */
export function validSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const MEDIA_LABEL: Record<string, string> = {
  image: "Photo",
  video: "Video",
  audio: "Voice message",
  document: "Document",
  sticker: "Sticker",
};

/** The text staff see for a message. Media is shown as a label with its caption. */
function describe(m: Json): string {
  const type = text(m.type) ?? "unknown";
  if (type === "text") return text(obj(m.text).body) ?? "[Empty message]";
  if (type in MEDIA_LABEL) {
    const media = obj(m[type]);
    const caption = text(media.caption) ?? text(media.filename);
    return caption ? `[${MEDIA_LABEL[type]}] ${caption}` : `[${MEDIA_LABEL[type]}]`;
  }
  if (type === "button") return text(obj(m.button).text) ?? "[Button reply]";
  if (type === "interactive") {
    const i = obj(m.interactive);
    return text(obj(i.button_reply).title) ?? text(obj(i.list_reply).title) ?? "[Reply]";
  }
  if (type === "location") {
    const l = obj(m.location);
    return `[Location] ${[text(l.name), text(l.address)].filter(Boolean).join(", ") || `${l.latitude}, ${l.longitude}`}`;
  }
  if (type === "contacts") return "[Contact card]";
  if (type === "reaction") return `[Reaction] ${text(obj(m.reaction).emoji) ?? "removed"}`;
  return "[Message type not supported yet]";
}

/** Reactions, stickers and system notices don't need a reply from the AI. */
export const shouldAnswer = (type: string) => !["reaction", "sticker", "system", "unsupported", "unknown"].includes(type);

/** Flattens a webhook body into messages and delivery updates for our own number only. */
export function parseWebhook(body: unknown, phoneNumberId: string): WebhookEvent[] {
  const events: WebhookEvent[] = [];
  for (const entry of list(obj(body).entry)) {
    for (const change of list(obj(entry).changes)) {
      const value = obj(obj(change).value);
      if (text(obj(value.metadata).phone_number_id) !== phoneNumberId) continue;

      const contacts = list(value.contacts).map(obj);
      for (const raw of list(value.messages)) {
        const m = obj(raw);
        const wamid = text(m.id);
        const from = text(m.from) ?? text(m.from_user_id);
        if (!wamid || !from) continue;
        const contact = contacts.find((c) => text(c.wa_id) === from || text(c.user_id) === from) ?? contacts[0] ?? {};
        const seconds = Number(m.timestamp);
        events.push({
          kind: "message",
          contactId: from,
          bsuid: text(m.from_user_id) ?? text(contact.user_id),
          name: text(obj(contact.profile).name),
          wamid,
          type: text(m.type) ?? "unknown",
          content: describe(m),
          sentAt: new Date(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Date.now()).toISOString(),
        });
      }

      for (const raw of list(value.statuses)) {
        const s = obj(raw);
        const wamid = text(s.id);
        const status = text(s.status);
        if (!wamid || !status) continue;
        const e = obj(list(s.errors)[0]);
        events.push({ kind: "status", wamid, status, error: text(e.title) ?? text(e.message) });
      }
    }
  }
  return events;
}
