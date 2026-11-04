"use client";

import type { Route } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { DrawerPanel, useDrawer } from "@/components/admin/drawer";
import { forgetThread } from "@/components/admin/thread-cache";
import { ChatConsole } from "@/components/admin/chats/ChatConsole";
import { DeleteChatButton } from "@/components/admin/chats/DeleteChatButton";

/** What the drawer shows before the messages arrive (all of it comes with the list). */
export type ChatSummary = {
  id: string;
  name: string | null;
  enquiryId: string | null;
  messageCount: number;
  startedPath: string | null;
  createdAt: string;
  aiPaused: boolean;
  visitorSeenAt: string | null;
};

export function ChatDrawer({ summaries }: { summaries: Record<string, ChatSummary> }) {
  const { selected, close } = useDrawer();
  const chat = selected ? summaries[selected] : undefined;
  if (!chat) return null;

  return (
    <DrawerPanel labelledBy="chat-title">
      <div className="flex items-start justify-between gap-4 border-b border-forest/10 p-6">
        <div className="min-w-0">
          <p className="eyebrow text-leaf">Chat · {formatDateTime(chat.createdAt)}</p>
          <h2 id="chat-title" className="mt-2 truncate font-display text-2xl font-light text-forest uppercase">
            {chat.name ?? "Website visitor"}
          </h2>
          <p className="mt-1 text-[0.8rem] text-ink-2">
            {chat.messageCount} messages{chat.startedPath ? ` · started on ${chat.startedPath}` : ""}
          </p>
        </div>
        <button type="button" onClick={close} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-forest/10 px-6 py-3">
        {chat.enquiryId ? (
          <Link href={`/admin/enquiries?tab=all&id=${chat.enquiryId}` as Route} className={buttonClass("lime", "sm")}>
            <Icon name="inbox" className="size-4" /> Open the enquiry
          </Link>
        ) : (
          <span className="text-[0.82rem] text-ink-2">No contact details were saved in this chat.</span>
        )}
        <span className="ml-auto">
          <DeleteChatButton
            sessionId={chat.id}
            onDeleted={() => {
              forgetThread("chats", chat.id);
              close();
            }}
          />
        </span>
      </div>
      <ChatConsole key={chat.id} sessionId={chat.id} initialPaused={chat.aiPaused} initialSeenAt={chat.visitorSeenAt} />
    </DrawerPanel>
  );
}
