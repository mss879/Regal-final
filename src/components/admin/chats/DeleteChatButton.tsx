"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteChat } from "@/lib/admin/actions/chats";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

export function DeleteChatButton({ sessionId, closeHref }: { sessionId: string; closeHref: Route }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className={buttonClass("danger", "sm")}
        onClick={() => {
          if (!window.confirm("Delete this conversation? Any enquiry it created is kept.")) return;
          start(async () => {
            const r = await deleteChat(sessionId);
            if (r.ok) router.replace(closeHref);
            else setError(r.error);
          });
        }}
      >
        <Icon name="trash" className="size-4" /> Delete chat
      </button>
      {error && <span className="text-[0.8rem] text-sold">{error}</span>}
    </div>
  );
}
