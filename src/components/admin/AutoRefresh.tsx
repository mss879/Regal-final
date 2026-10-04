"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the current admin page every few seconds while it's visible (e.g. the live chat list). */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [router, seconds]);
  return null;
}
