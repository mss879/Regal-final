"use client";

import { useState, useTransition } from "react";
import { deleteWhatsAppChat } from "@/lib/admin/actions/whatsapp";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

export function DeleteWhatsAppButton({ conversationId, onDeleted }: { conversationId: string; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className={buttonClass("danger", "sm")}
        onClick={() => {
          if (!window.confirm("Delete this conversation from the website? The customer keeps their copy on WhatsApp.")) return;
          start(async () => {
            const r = await deleteWhatsAppChat(conversationId);
            if (r.ok) onDeleted();
            else setError(r.error);
          });
        }}
      >
        <Icon name="trash" className="size-4" /> Delete chat
      </button>
      {error && <p className="text-[0.8rem] text-sold" role="alert">{error}</p>}
    </div>
  );
}
