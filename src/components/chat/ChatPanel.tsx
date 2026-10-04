"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Logo } from "@/components/ui/Logo";
import { CREDIT } from "@/lib/site";
import { ASSISTANT_NAME, CHAT_STORAGE_KEY, GREETING, QUICK_PROMPTS, type ChatMessage } from "./shared";

type Stored = {
  sessionId: string;
  messages: ChatMessage[];
  /** Highest saved message id seen; polling asks for anything newer. */
  lastId: number;
  /** A member of staff has switched the AI off and is replying in person. */
  aiPaused: boolean;
};

type ServerLine = { id: number; role: "assistant" | "agent"; content: string };

function loadStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Partial<Stored>) : null;
    if (!data || typeof data.sessionId !== "string" || !Array.isArray(data.messages)) return null;
    return { sessionId: data.sessionId, messages: data.messages, lastId: Number(data.lastId) || 0, aiPaused: Boolean(data.aiPaused) };
  } catch {
    return null;
  }
}

const newId = () => crypto.randomUUID();
const fresh = (): Stored => ({ sessionId: newId(), messages: [GREETING], lastId: 0, aiPaused: false });

/** Adds replies from the server that aren't on screen yet. */
function merge(state: Stored, lines: ServerLine[], paused: boolean): Stored {
  const known = new Set(state.messages.map((m) => m.serverId).filter(Boolean));
  const added = lines.filter((l) => !known.has(l.id)).map((l) => ({ id: newId(), role: l.role, content: l.content, serverId: l.id }));
  const lastId = Math.max(state.lastId, ...lines.map((l) => l.id));
  if (!added.length && lastId === state.lastId && paused === state.aiPaused) return state;
  return { ...state, messages: [...state.messages, ...added], lastId, aiPaused: paused };
}

export function ChatPanel({ open, onClose, onUnread }: { open: boolean; onClose: () => void; onUnread: (n: number) => void }) {
  const [state, setState] = useState<Stored>(() => loadStored() ?? fresh());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const { sessionId, messages, aiPaused } = state;
  const started = messages.some((m) => m.role === "user");

  // Keep the conversation for this tab (across page loads).
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Listen for staff replies (and the AI being switched on/off): every 4 s while the chat is
  // open, every 15 s while it's closed, never while the tab is hidden.
  useEffect(() => {
    if (!started) return;
    let stopped = false;
    const tick = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/chat?session=${sessionId}&after=${state.lastId}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { aiPaused: boolean; messages: ServerLine[] };
        setState((s) => (s.sessionId === sessionId ? merge(s, data.messages, data.aiPaused) : s));
        const replies = data.messages.filter((m) => m.role === "agent").length;
        if (!open && replies) onUnread(replies);
      } catch {}
    };
    const timer = window.setInterval(tick, open ? 4000 : 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [started, open, sessionId, state.lastId, onUnread]);

  // While waiting: follow the typing dots. After a reply: show the start of the new message.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (loading) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    else if (lastRef.current) list.scrollTo({ top: Math.max(0, lastRef.current.offsetTop - 16), behavior: "smooth" });
  }, [messages.length, loading, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { id: newId(), role: "user" as const, content }];
    setState((s) => ({ ...s, messages: next }));
    setInput("");
    setError(null);
    setLoading(true);
    busy.current = true;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          path: window.location.pathname,
          // Staff replies are sent as assistant turns; the server uses its saved transcript when it can.
          messages: next.slice(-40).map(({ role, content }) => ({ role: role === "user" ? "user" : "assistant", content })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { content?: string | null; saved?: boolean; lastId?: number | null; aiPaused?: boolean };
      if (data.content === undefined) throw new Error(`HTTP ${res.status}`);
      setState((s) => {
        const lastId = Math.max(s.lastId, data.lastId ?? 0);
        const already = data.lastId != null && s.messages.some((m) => m.serverId === data.lastId);
        const reply: ChatMessage[] =
          data.content && !already ? [{ id: newId(), role: "assistant", content: data.content, saved: data.saved, serverId: data.lastId ?? undefined }] : [];
        return { ...s, messages: [...s.messages, ...reply], lastId, aiPaused: Boolean(data.aiPaused) };
      });
    } catch {
      setError("Sorry, the message didn't go through.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== lastUser.id) }));
    void send(lastUser.content);
  };

  const restart = () => {
    setState(fresh());
    setError(null);
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  // Internal links navigate in-app; on phones the panel closes so the page is visible.
  const markdown: Components = {
    a: ({ href = "", children }) =>
      href.startsWith("/") ? (
        <Link href={href as Route} onClick={() => window.innerWidth < 640 && onClose()}>
          {children}
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
  };

  const bubble =
    "max-w-[90%] rounded-[20px] rounded-tl-md px-4 py-3 text-[0.9rem] leading-relaxed text-forest [&_a]:font-medium [&_a]:underline [&_a]:decoration-leaf [&_a]:underline-offset-2 hover:[&_a]:text-leaf [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2.5 [&_strong]:font-semibold [&_table]:mt-2 [&_table]:w-full [&_table]:text-[0.8rem] [&_td]:border-t [&_td]:border-forest/10 [&_td]:py-1 [&_td]:pr-2 [&_th]:pr-2 [&_th]:text-left [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5";

  return (
    <section
      id="rvl-chat-panel"
      role="dialog"
      aria-label={`Chat with ${ASSISTANT_NAME}, the Regal Victoria Lakeside assistant`}
      aria-modal="false"
      hidden={!open}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-x-3 top-3 bottom-[5.25rem] z-[55] flex flex-col overflow-hidden rounded-[28px] border border-forest/10 bg-paper shadow-[0_30px_80px_-20px_rgba(18,35,26,0.55)] sm:inset-x-auto sm:top-auto sm:right-4 sm:bottom-[5.5rem] sm:h-[min(640px,calc(100dvh-7.5rem))] sm:w-[400px] md:right-6 md:bottom-24"
    >
      <header className="grain relative flex items-center gap-3 bg-forest px-5 py-4 text-paper">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper/10">
          <Logo variant="emblem" className="w-4 text-lime" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.05rem] leading-tight">{ASSISTANT_NAME}</p>
          <p className="flex items-center gap-1.5 truncate text-[0.72rem] text-sage-2">
            <span className="size-1.5 shrink-0 rounded-full bg-leaf-2" />
            {aiPaused ? "Chatting with our team" : "AI assistant · online"}
          </p>
        </div>
        <button type="button" onClick={restart} className="relative rounded-full px-2.5 py-1.5 text-[0.72rem] text-sage-2 transition-colors hover:bg-paper/10 hover:text-paper" title="Start a new conversation">
          New chat
        </button>
        <button type="button" onClick={onClose} aria-label="Close the chat" className="relative rounded-full p-2 text-sage-2 transition-colors hover:bg-paper/10 hover:text-paper">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div ref={listRef} data-lenis-prevent className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={m.id} ref={i === messages.length - 1 ? lastRef : undefined} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
            {m.role === "user" ? (
              <p className="max-w-[85%] rounded-[20px] rounded-tr-md bg-forest px-4 py-2.5 text-[0.9rem] leading-relaxed whitespace-pre-wrap text-paper">{m.content}</p>
            ) : (
              <>
                {m.role === "agent" && (
                  <span className="mb-1 flex items-center gap-1.5 pl-1 text-[0.7rem] font-semibold tracking-[0.04em] text-leaf">
                    <span className="size-1.5 rounded-full bg-leaf" /> Sales team
                  </span>
                )}
                {m.role === "agent" ? (
                  <p className={`${bubble} border border-leaf/30 bg-lime/30 whitespace-pre-wrap`}>{m.content}</p>
                ) : (
                  <div className={`${bubble} bg-cream`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdown}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
                {m.saved && (
                  <p className="mt-1.5 flex items-center gap-1.5 pl-1 text-[0.72rem] font-semibold text-leaf">
                    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    Your details were sent to our team
                  </p>
                )}
              </>
            )}
          </div>
        ))}

        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="rounded-full border border-forest/20 px-3.5 py-1.5 text-[0.8rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-paper"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {loading && !aiPaused && (
          <div className="flex items-center gap-1.5 rounded-[20px] rounded-tl-md bg-cream px-4 py-3.5" style={{ width: "fit-content" }} aria-label="The assistant is typing">
            {[0, 150, 300].map((d) => (
              <span key={d} className="size-1.5 animate-bounce rounded-full bg-moss motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}

        {aiPaused && (
          <p className="mx-auto w-fit rounded-full bg-forest/[0.06] px-3.5 py-1.5 text-center text-[0.72rem] text-ink-2">
            A member of our team is with you — replies appear here.
          </p>
        )}

        {error && (
          <div className="rounded-2xl border border-sold/25 bg-sold/5 px-4 py-3 text-[0.82rem] text-sold" role="alert">
            {error}{" "}
            <button type="button" onClick={retry} className="font-semibold underline underline-offset-2">Try again</button>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-forest/10 bg-paper px-3 pt-3 pb-2">
        <div className="flex items-end gap-2 rounded-[22px] border border-forest/15 bg-white/70 py-1.5 pr-1.5 pl-4 transition-colors focus-within:border-leaf">
          <label htmlFor="rvl-chat-input" className="sr-only">Your message</label>
          <textarea
            id="rvl-chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={1500}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
            }}
            onKeyDown={onKeyDown}
            placeholder={aiPaused ? "Message our team…" : "Ask about the villas…"}
            className="max-h-28 flex-1 resize-none bg-transparent py-2 text-[0.92rem] text-forest placeholder:text-ink-2/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-paper transition-colors hover:bg-leaf disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>
          </button>
        </div>
        <div className="mt-2 flex justify-center px-2 text-[0.68rem] leading-snug text-ink-2/80">
          <a href={CREDIT.url} target="_blank" rel="noopener" title={CREDIT.title} className="flex items-center gap-1 transition-colors hover:text-forest">
            Powered by
            <Image src={CREDIT.logoDark.src} alt={CREDIT.name} width={44} height={10} className="h-2.5 w-auto" />
          </a>
        </div>
      </form>
    </section>
  );
}
