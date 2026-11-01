"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { getWhatsAppUpdates, sendWhatsAppReply } from "@/lib/admin/actions/whatsapp";
import { formatTime } from "@/lib/time";
import type { WhatsAppLine } from "@/lib/admin/types";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

const STATUS_LABEL: Record<WhatsAppLine["status"], string> = {
  received: "Customer",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};
const REPLY_WINDOW = 24 * 60 * 60 * 1000;

/** Live view of one WhatsApp conversation: new messages every 3 s and a reply box. */
export function WhatsAppConsole({
  conversationId,
  initialLines,
  initialLastInboundAt,
}: {
  conversationId: string;
  initialLines: WhatsAppLine[];
  initialLastInboundAt: string | null;
}) {
  const [lines, setLines] = useState(initialLines);
  const [lastInboundAt, setLastInboundAt] = useState(initialLastInboundAt);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await getWhatsAppUpdates(conversationId);
      if (stopped) return;
      setNow(Date.now());
      if (!r.ok) return setError(r.error);
      setLines(r.lines);
      setLastInboundAt(r.lastInboundAt);
    };
    void poll();
    const timer = window.setInterval(poll, 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  const windowEnds = lastInboundAt ? new Date(lastInboundAt).getTime() + REPLY_WINDOW : 0;
  const canReply = windowEnds > now;
  const hoursLeft = Math.ceil((windowEnds - now) / 3_600_000);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    start(async () => {
      setError(undefined);
      const r = await sendWhatsAppReply(conversationId, text);
      if (!r.ok) return setError(r.error);
      setDraft("");
      const u = await getWhatsAppUpdates(conversationId);
      if (u.ok) setLines(u.lines);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5" aria-live="polite">
        {lines.map((m) => (
          <li key={m.id} className={m.direction === "in" ? "flex flex-col items-start" : "flex flex-col items-end"}>
            <p
              className={`max-w-[88%] rounded-[18px] px-4 py-2.5 text-[0.88rem] leading-relaxed whitespace-pre-wrap ${
                m.direction === "in" ? "rounded-tl-md bg-cream text-forest" : "rounded-tr-md bg-forest text-paper"
              }`}
            >
              {m.content}
            </p>
            <span className={`mt-1 px-1 text-[0.68rem] ${m.status === "failed" ? "text-sold" : "text-ink-2"}`}>
              {STATUS_LABEL[m.status]} · {formatTime(m.created_at)}
              {m.error ? ` · ${m.error}` : ""}
            </span>
          </li>
        ))}
      </ol>

      <div className="border-t border-forest/10 p-4">
        {canReply ? (
          <>
            <p className="mb-2 text-[0.75rem] text-ink-2">
              {hoursLeft === 1 ? "Less than an hour" : `${hoursLeft} hours`} left to reply. WhatsApp allows replies for 24 hours after the customer&apos;s last message.
            </p>
            <div className="flex items-end gap-2">
              <label htmlFor="whatsapp-reply" className="sr-only">Reply on WhatsApp</label>
              <textarea
                id="whatsapp-reply"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                maxLength={4000}
                placeholder="Write a reply… (⌘/Ctrl + Enter to send)"
                className="min-h-11 flex-1 resize-y rounded-2xl border border-forest/15 bg-white/70 px-3.5 py-2.5 text-[0.9rem] text-forest placeholder:text-ink-2/60 focus:border-leaf focus:ring-2 focus:ring-leaf/20 focus:outline-none"
              />
              <button type="button" onClick={send} disabled={pending || !draft.trim()} className={buttonClass("primary")}>
                <Icon name="move" className="size-4" /> Send
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-2xl bg-cream px-4 py-3 text-[0.82rem] text-forest">
            WhatsApp&apos;s 24-hour reply window has closed. You can reply again as soon as this customer sends a new message.
          </p>
        )}
        {error && <p className="mt-2 text-[0.8rem] text-sold" role="alert">{error}</p>}
      </div>
    </div>
  );
}
