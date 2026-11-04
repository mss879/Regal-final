"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { sendChatReply, setChatAi } from "@/lib/admin/actions/chats";
import { formatTime, relativeTime } from "@/lib/time";
import type { ChatLine } from "@/lib/admin/types";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { fetchThread, peekThread, prefetchThread, rememberThread } from "@/components/admin/thread-cache";
import { ThreadSkeleton } from "@/components/admin/drawer";

const ROLE_LABEL: Record<ChatLine["role"], string> = { user: "Visitor", assistant: "AI assistant", agent: "Staff" };
const POLL_MS = 3000;

type Thread = { lines: ChatLine[]; aiPaused: boolean; visitorSeenAt: string | null };

const merge = (prev: ChatLine[], next: ChatLine[]) => (next.length ? [...prev, ...next.filter((l) => !prev.some((p) => p.id === l.id))] : prev);

/**
 * Live view of one chat: new messages every 3 s, the AI on/off switch, and a reply box.
 * Replying switches the AI off (in the database) so it never talks over a person.
 */
export function ChatConsole({
  sessionId,
  initialPaused,
  initialSeenAt,
}: {
  sessionId: string;
  initialPaused: boolean;
  initialSeenAt: string | null;
}) {
  const [cached] = useState(() => peekThread<Thread>("chats", sessionId));
  const [lines, setLines] = useState<ChatLine[] | null>(cached?.lines ?? null);
  const [paused, setPaused] = useState(cached?.aiPaused ?? initialPaused);
  const [seenAt, setSeenAt] = useState(cached?.visitorSeenAt ?? initialSeenAt);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const linesRef = useRef(lines);

  // Pull anything newer than the last message we have; the first call loads the whole chat.
  const pull = useCallback(async () => {
    const have = linesRef.current;
    const r = have
      ? await fetchThread<Thread>("chats", sessionId, `?after=${have.length ? have[have.length - 1].id : 0}`)
      : await prefetchThread<Thread>("chats", sessionId);
    const next = have ? merge(have, r.lines) : r.lines;
    linesRef.current = next;
    rememberThread("chats", sessionId, { ok: true, lines: next, aiPaused: r.aiPaused, visitorSeenAt: r.visitorSeenAt });
    setLines(next);
    setPaused(r.aiPaused);
    setSeenAt(r.visitorSeenAt);
    setNow(Date.now());
    setError(undefined);
  }, [sessionId]);

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

  const toggleAi = () =>
    start(async () => {
      setError(undefined);
      const r = await setChatAi(sessionId, !paused);
      if (r.ok) setPaused(!paused);
      else setError(r.error);
    });

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    start(async () => {
      setError(undefined);
      const r = await sendChatReply(sessionId, text);
      if (!r.ok) return setError(r.error);
      setDraft("");
      setPaused(true);
      await pull().catch(() => {});
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  };

  const online = seenAt ? now - new Date(seenAt).getTime() < 90_000 : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-forest/10 px-6 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={!paused}
          disabled={pending}
          onClick={toggleAi}
          className="group flex items-center gap-2.5 rounded-full border border-forest/15 py-1.5 pr-3.5 pl-1.5 text-[0.82rem] font-semibold text-forest transition-colors hover:border-forest/40 disabled:opacity-60"
        >
          <span className={`relative h-5 w-9 rounded-full transition-colors ${paused ? "bg-forest/20" : "bg-leaf"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-paper shadow transition-transform ${paused ? "translate-x-0.5" : "translate-x-[18px]"}`} />
          </span>
          AI replies {paused ? "off" : "on"}
        </button>
        <span className="flex items-center gap-1.5 text-[0.78rem] text-ink-2">
          <span className={`size-2 rounded-full ${online ? "bg-leaf" : "bg-forest/20"}`} />
          {online ? "Visitor is here now" : seenAt ? `Visitor last seen ${relativeTime(seenAt, now)}` : "Visitor offline"}
        </span>
      </div>

      <ol ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5" aria-live="polite">
        {lines === null && <ThreadSkeleton />}
        {lines?.length === 0 && <li className="py-10 text-center text-[0.85rem] text-ink-2">No messages in this chat yet.</li>}
        {lines?.map((m) => (
          <li key={m.id} className={m.role === "user" ? "flex flex-col items-start" : "flex flex-col items-end"}>
            <p
              className={`max-w-[88%] rounded-[18px] px-4 py-2.5 text-[0.88rem] leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "rounded-tl-md bg-cream text-forest"
                  : m.role === "agent"
                    ? "rounded-tr-md bg-forest text-paper"
                    : "rounded-tr-md border border-forest/10 bg-paper text-forest"
              }`}
            >
              {m.content}
            </p>
            <span className="mt-1 px-1 text-[0.68rem] text-ink-2">
              {ROLE_LABEL[m.role]} · {formatTime(m.created_at)}
            </span>
          </li>
        ))}
      </ol>

      <div className="border-t border-forest/10 p-4">
        <p className="mb-2 text-[0.75rem] text-ink-2">
          {paused
            ? "The AI is off — you're answering this visitor. Switch it back on when you're done."
            : "The AI is answering. Sending a message switches it off so you can take over."}
        </p>
        <div className="flex items-end gap-2">
          <label htmlFor="staff-reply" className="sr-only">Reply to the visitor</label>
          <textarea
            id="staff-reply"
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
        {error && <p className="mt-2 text-[0.8rem] text-sold" role="alert">{error}</p>}
      </div>
    </div>
  );
}

