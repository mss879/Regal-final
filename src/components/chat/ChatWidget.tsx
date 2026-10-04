"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { introExit } from "@/lib/intro";
import { Logo } from "@/components/ui/Logo";
import { TEASER_KEY } from "./shared";

// The panel (conversation, markdown, API calls) is only downloaded when someone shows interest,
// so the AI assistant adds almost nothing to page weight.
const loadPanel = () => import("./ChatPanel");
const ChatPanel = dynamic(() => loadPanel().then((m) => m.ChatPanel), { ssr: false });

/** Floating AI assistant, bottom right of every public page. */
export function ChatWidget() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [unread, setUnread] = useState(0);
  const launcher = useRef<HTMLButtonElement>(null);
  // Stable, so the panel's polling timer isn't reset on every render.
  const onUnread = useCallback((n: number) => setUnread((u) => u + n), []);

  // Appear once the home-page intro has dissolved (immediately on other pages).
  useEffect(() => {
    let alive = true;
    introExit().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // A one-off nudge per browser tab, after a while on the site.
  useEffect(() => {
    if (!ready) return;
    let seen = false;
    try {
      seen = Boolean(sessionStorage.getItem(TEASER_KEY));
    } catch {}
    if (seen) return;
    const t = window.setTimeout(() => setTeaser(true), 15_000);
    return () => window.clearTimeout(t);
  }, [ready]);

  const dismissTeaser = () => {
    setTeaser(false);
    try {
      sessionStorage.setItem(TEASER_KEY, "1");
    } catch {}
  };

  const toggle = () => {
    dismissTeaser();
    setMounted(true);
    setUnread(0);
    setOpen((o) => !o);
  };

  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };

  return (
    <div data-state={ready ? "ready" : "hidden"} className="group/chat">
      {mounted && <ChatPanel open={open} onClose={close} onUnread={onUnread} />}

      {teaser && !open && (
        <div className="fixed right-4 bottom-[5.5rem] z-[55] w-[min(17rem,calc(100vw-2rem))] rounded-[20px] border border-forest/10 bg-paper p-4 pr-9 text-[0.85rem] leading-relaxed text-forest shadow-xl md:right-6 md:bottom-24">
          <button type="button" onClick={toggle} className="text-left">
            <span className="font-semibold">Questions about the villas?</span> Ask me anything — I can also arrange a site visit.
          </button>
          <button type="button" onClick={dismissTeaser} aria-label="Dismiss" className="absolute top-2.5 right-2.5 rounded-full p-1 text-ink-2 hover:bg-cream hover:text-forest">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      )}

      <button
        ref={launcher}
        type="button"
        onClick={toggle}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-expanded={open}
        aria-controls="rvl-chat-panel"
        aria-label={open ? "Close the chat" : unread ? `Chat — ${unread} new message${unread > 1 ? "s" : ""} from our team` : "Chat with our AI assistant"}
        className="fixed right-4 bottom-4 z-[55] flex h-14 items-center gap-3 rounded-full bg-forest pr-5 pl-4 text-paper shadow-[0_12px_40px_-12px_rgba(18,35,26,0.6)] ring-1 ring-paper/10 transition-[opacity,transform,background-color] duration-500 ease-[var(--ease-out-expo)] group-data-[state=hidden]/chat:pointer-events-none group-data-[state=hidden]/chat:translate-y-4 group-data-[state=hidden]/chat:opacity-0 hover:bg-forest-3 max-sm:w-14 max-sm:justify-center max-sm:px-0 md:right-6 md:bottom-6 motion-reduce:transition-none"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        ) : (
          <span aria-hidden className="relative">
            <Logo variant="emblem" className="w-[18px] text-lime" />
            {unread > 0 ? (
              <span className="absolute -top-2.5 -right-3 flex size-[18px] items-center justify-center rounded-full bg-lime text-[0.62rem] font-bold text-forest ring-2 ring-forest">
                {Math.min(unread, 9)}
              </span>
            ) : (
              <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-leaf-2 ring-2 ring-forest" />
            )}
          </span>
        )}
        <span className="text-[0.9rem] font-semibold max-sm:sr-only">{open ? "Close" : "Ask us"}</span>
      </button>
    </div>
  );
}
