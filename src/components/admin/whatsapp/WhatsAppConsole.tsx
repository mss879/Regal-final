"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { sendWhatsAppReply, setWhatsAppAi } from "@/lib/admin/actions/whatsapp";
import { formatTime } from "@/lib/time";
import type { WhatsAppLine } from "@/lib/admin/types";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { ThreadSkeleton } from "@/components/admin/drawer";
import { fetchThread, peekThread, prefetchThread, rememberThread } from "@/components/admin/thread-cache";

const STATUS_LABEL: Record<WhatsAppLine["status"], string> = {
  received: "",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};
const REPLY_WINDOW = 24 * 60 * 60 * 1000;
const POLL_MS = 3000;

type Thread = { lines: WhatsAppLine[]; lastInboundAt: string | null; aiPausedUntil: string | null };

const SENDER = (m: WhatsAppLine) => (m.direction === "in" ? "Customer" : m.sent_by === "ai" ? "AI assistant" : "Staff");

/** Live view of one WhatsApp conversation: new messages every 3 s, the AI switch and a reply box. */
export function WhatsAppConsole({
  conversationId,
  initialLastInboundAt,
  initialAiPausedUntil,
}: {
  conversationId: string;
  initialLastInboundAt: string | null;
  initialAiPausedUntil: string | null;
}) {
  const [cached] = useState(() => peekThread<Thread>("whatsapp", conversationId));
  const [lines, setLines] = useState<WhatsAppLine[] | null>(cached?.lines ?? null);
  const [lastInboundAt, setLastInboundAt] = useState(cached?.lastInboundAt ?? initialLastInboundAt);
  const [aiPausedUntil, setAiPausedUntil] = useState(cached?.aiPausedUntil ?? initialAiPausedUntil);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const loaded = useRef(Boolean(cached));

  // The latest messages (statuses change too, so the recent history is re-read each time).
  const pull = useCallback(async () => {
    const r = loaded.current ? await fetchThread<Thread>("whatsapp", conversationId) : await prefetchThread<Thread>("whatsapp", conversationId);
    loaded.current = true;
    rememberThread("whatsapp", conversationId, r);
    setLines(r.lines);
    setLastInboundAt(r.lastInboundAt);
    setAiPausedUntil(r.aiPausedUntil);
    setNow(Date.now());
    setError(undefined);
  }, [conversationId]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const loop = async () => {
      if (document.visibilityState === "visible") {
        try {
          await pull();
        } catch (err) {
          if (!stopped) setError(err instanceof Error ? err.message : "Couldn't load new messages.");
        }
      }
      if (!stopped) timer = window.setTimeout(loop, POLL_MS);
    };
    void loop();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [pull]);

  // Jump to the newest message on open, then scroll smoothly as new ones arrive.
  const scrolled = useRef(false);
  useEffect(() => {
    if (!lines?.length) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: scrolled.current ? "smooth" : "auto" });
    scrolled.current = true;
  }, [lines?.length]);

  const windowEnds = lastInboundAt ? new Date(lastInboundAt).getTime() + REPLY_WINDOW : 0;
  const canReply = windowEnds > now;
  const hoursLeft = Math.ceil((windowEnds - now) / 3_600_000);
  const aiOn = !aiPausedUntil || new Date(aiPausedUntil).getTime() <= now;

  const toggleAi = () =>
    start(async () => {
      setError(undefined);
      const r = await setWhatsAppAi(conversationId, !aiOn);
      if (!r.ok) return setError(r.error);
      await pull().catch(() => {});
    });

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    start(async () => {
      setError(undefined);
      const r = await sendWhatsAppReply(conversationId, text);
      if (!r.ok) return setError(r.error);
      setDraft("");
      await pull().catch(() => {});
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
      <div className="flex flex-wrap items-center gap-3 border-b border-forest/10 px-6 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={aiOn}
          disabled={pending}
          onClick={toggleAi}
          className="group flex items-center gap-2.5 rounded-full border border-forest/15 py-1.5 pr-3.5 pl-1.5 text-[0.82rem] font-semibold text-forest transition-colors hover:border-forest/40 disabled:opacity-60"
        >
          <span className={`relative h-5 w-9 rounded-full transition-colors ${aiOn ? "bg-leaf" : "bg-forest/20"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-paper shadow transition-transform ${aiOn ? "translate-x-[18px]" : "translate-x-0.5"}`} />
          </span>
          AI replies {aiOn ? "on" : "off"}
        </button>
        <span className="text-[0.78rem] text-ink-2">
          {aiOn ? "The AI answers new messages. Your reply pauses it for 8 hours." : `Paused until ${formatTime(aiPausedUntil!)}, then the AI answers again.`}
        </span>
      </div>

      <ol ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5" aria-live="polite">
        {lines === null && <ThreadSkeleton />}
        {lines?.map((m) => (
          <li key={m.id} className={m.direction === "in" ? "flex flex-col items-start" : "flex flex-col items-end"}>
            <p
              className={`max-w-[88%] rounded-[18px] px-4 py-2.5 text-[0.88rem] leading-relaxed whitespace-pre-wrap ${
                m.direction === "in"
                  ? "rounded-tl-md bg-cream text-forest"
                  : m.sent_by === "ai"
                    ? "rounded-tr-md border border-forest/10 bg-paper text-forest"
                    : "rounded-tr-md bg-forest text-paper"
              }`}
            >
              {m.content}
            </p>
            <span className={`mt-1 px-1 text-[0.68rem] ${m.status === "failed" ? "text-sold" : "text-ink-2"}`}>
              {[SENDER(m), STATUS_LABEL[m.status], formatTime(m.created_at)].filter(Boolean).join(" · ")}
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
