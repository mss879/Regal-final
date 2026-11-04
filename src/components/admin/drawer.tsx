"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { prefetchThread, type ThreadKind } from "@/components/admin/thread-cache";

// A conversation drawer that opens and closes in the browser, with no server round trip. The
// open conversation is kept in the URL (?id=…) with the History API, so links, reload and the
// back button still work; its messages load from /admin/api in the background.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Drawer = { selected: string | null; open: (id: string) => void; close: () => void; prefetch: (id: string) => void };
const DrawerContext = createContext<Drawer | null>(null);

export function useDrawer() {
  const drawer = useContext(DrawerContext);
  if (!drawer) throw new Error("useDrawer must be used inside <DrawerProvider>.");
  return drawer;
}

const urlWith = (id: string | null) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  return url.pathname + url.search + url.hash;
};

export function DrawerProvider({ kind, children }: { kind: ThreadKind; children: ReactNode }) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const param = useSearchParams().get("id");
  const urlId = param && UUID.test(param) ? param : null;
  const [selected, setSelected] = useState(urlId);
  // Follow the URL when it changes from outside (back/forward buttons, links).
  const [seenUrlId, setSeenUrlId] = useState(urlId);
  if (urlId !== seenUrlId) {
    setSeenUrlId(urlId);
    setSelected(urlId);
  }
  // True when the open drawer added a history entry, so closing can step back over it.
  const pushed = useRef(false);

  const open = useCallback(
    (id: string) => {
      setSelected(id);
      if (urlId) window.history.replaceState(null, "", urlWith(id));
      else {
        window.history.pushState(null, "", urlWith(id));
        pushed.current = true;
      }
    },
    [urlId],
  );

  const close = useCallback(() => {
    setSelected(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else window.history.replaceState(null, "", urlWith(null));
    // Refresh the list (unread counts, badges) in the background; the drawer is already gone.
    window.setTimeout(() => startRefresh(() => router.refresh()), 50);
  }, [router]);

  const prefetch = useCallback((id: string) => void prefetchThread(kind, id).catch(() => {}), [kind]);

  const value = useMemo(() => ({ selected, open, close, prefetch }), [selected, open, close, prefetch]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

/** A list row that opens the drawer instantly (and starts loading the messages on hover). */
export function DrawerLink({ id, href, className, children }: { id: string; href: string; className?: string; children: ReactNode }) {
  const { selected, open, prefetch } = useDrawer();
  return (
    <a
      href={href}
      aria-current={selected === id ? "true" : undefined}
      className={className}
      onPointerEnter={() => prefetch(id)}
      onFocus={() => prefetch(id)}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(id);
      }}
    >
      {children}
    </a>
  );
}

/** The drawer's overlay and panel. Escape or a click outside closes it. */
export function DrawerPanel({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const { close } = useDrawer();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button type="button" onClick={close} className="absolute inset-0 cursor-default bg-forest/40 backdrop-blur-[2px]" aria-label="Close chat" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-paper shadow-2xl sm:inset-y-3 sm:right-3 sm:rounded-[28px]">{children}</aside>
    </div>
  );
}

/** Re-fetches the list every few seconds while it's visible and no conversation is open. */
export function DrawerAutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const { selected } = useDrawer();
  useEffect(() => {
    if (selected) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [router, seconds, selected]);
  return null;
}

/** Placeholder bubbles while the messages load. */
export function ThreadSkeleton() {
  return (
    <>
      {["w-2/3 self-start", "w-1/2 self-end", "w-3/5 self-start", "w-2/5 self-end"].map((c, i) => (
        <li key={i} aria-hidden className={`flex flex-col ${c.includes("self-end") ? "items-end" : "items-start"}`}>
          <span className={`block h-12 animate-pulse rounded-[18px] bg-forest/[0.07] motion-reduce:animate-none ${c.split(" ")[0]}`} />
        </li>
      ))}
      <li className="sr-only">Loading messages…</li>
    </>
  );
}
