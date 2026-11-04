"use client";

import type { Route } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { DrawerPanel, useDrawer } from "@/components/admin/drawer";
import { forgetThread } from "@/components/admin/thread-cache";
import { WhatsAppConsole } from "@/components/admin/whatsapp/WhatsAppConsole";
import { DeleteWhatsAppButton } from "@/components/admin/whatsapp/DeleteWhatsAppButton";

/** What the drawer shows before the messages arrive (all of it comes with the list). */
export type WhatsAppSummary = {
  id: string;
  title: string;
  number: string;
  enquiryId: string | null;
  createdAt: string;
  lastInboundAt: string | null;
  aiPausedUntil: string | null;
};

export function WhatsAppDrawer({ summaries }: { summaries: Record<string, WhatsAppSummary> }) {
  const { selected, close } = useDrawer();
  const chat = selected ? summaries[selected] : undefined;
  if (!chat) return null;

  return (
    <DrawerPanel labelledBy="whatsapp-title">
      <div className="flex items-start justify-between gap-4 border-b border-forest/10 p-6">
        <div className="min-w-0">
          <p className="eyebrow text-leaf">WhatsApp · since {formatDateTime(chat.createdAt)}</p>
          <h2 id="whatsapp-title" className="mt-2 truncate font-display text-2xl font-light text-forest uppercase">
            {chat.title}
          </h2>
          <p className="mt-1 text-[0.8rem] text-ink-2">{chat.number}</p>
        </div>
        <button type="button" onClick={close} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-forest/10 px-6 py-3">
        {chat.enquiryId && (
          <Link href={`/admin/enquiries?tab=all&id=${chat.enquiryId}` as Route} className={buttonClass("lime", "sm")}>
            <Icon name="inbox" className="size-4" /> Open the call request
          </Link>
        )}
        <span className="ml-auto">
          <DeleteWhatsAppButton
            conversationId={chat.id}
            onDeleted={() => {
              forgetThread("whatsapp", chat.id);
              close();
            }}
          />
        </span>
      </div>
      <WhatsAppConsole key={chat.id} conversationId={chat.id} initialLastInboundAt={chat.lastInboundAt} initialAiPausedUntil={chat.aiPausedUntil} />
    </DrawerPanel>
  );
}
