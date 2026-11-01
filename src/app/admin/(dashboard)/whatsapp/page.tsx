import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { whatsappConfigured } from "@/lib/env";
import { nowMs } from "@/lib/admin/now";
import { formatDateTime, relativeTime } from "@/lib/time";
import type { WhatsAppConversation, WhatsAppLine } from "@/lib/admin/types";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { DeleteWhatsAppButton } from "@/components/admin/whatsapp/DeleteWhatsAppButton";
import { WhatsAppConsole } from "@/components/admin/whatsapp/WhatsAppConsole";

export const metadata: Metadata = { title: "WhatsApp chat" };

const PAGE_SIZE = 30;
const HISTORY = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const contactNumber = (c: Pick<WhatsAppConversation, "contact_id">) => (/^\d+$/.test(c.contact_id) ? `+${c.contact_id}` : "Number hidden");

export default async function WhatsAppPage({ searchParams }: PageProps<"/admin/whatsapp">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const page = Math.max(1, Number.parseInt(str(sp.page), 10) || 1);
  const selectedId = UUID.test(str(sp.id)) ? str(sp.id) : null;

  const href = (params: Record<string, string | number | null>) => {
    const merged = { page: page > 1 ? page : null, id: selectedId, ...params };
    const s = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== null && v !== "").map(([k, v]) => [k, String(v)]));
    return `/admin/whatsapp${s.size ? `?${s}` : ""}` as Route;
  };

  const [listRes, detail] = await Promise.all([
    supabase
      .from("whatsapp_conversations")
      .select("id, contact_id, profile_name, unread_count, last_preview, last_direction, last_inbound_at, last_message_at, created_at", { count: "exact" })
      .order("last_message_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    selectedId
      ? Promise.all([
          supabase.from("whatsapp_conversations").select("*").eq("id", selectedId).maybeSingle<WhatsAppConversation>(),
          supabase
            .from("whatsapp_messages")
            .select("id, direction, message_type, content, status, error, created_at")
            .eq("conversation_id", selectedId)
            .order("id", { ascending: false })
            .limit(HISTORY),
        ])
      : null,
  ]);
  if (listRes.error) throw new Error(listRes.error.message);
  const conversations = (listRes.data ?? []) as WhatsAppConversation[];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = detail?.[0].data ?? null;
  const lines = ((detail?.[1].data ?? []) as WhatsAppLine[]).reverse();
  const now = nowMs();

  return (
    <>
      {!selected && <AutoRefresh seconds={10} />}
      <PageHeader
        eyebrow="WhatsApp"
        title="WhatsApp chat"
        description="Messages sent to the business WhatsApp number appear here. Open a conversation to read it and reply. Replies go straight to the customer's WhatsApp."
      />

      {!whatsappConfigured() && (
        <p className="mb-5 rounded-2xl bg-lime/25 px-5 py-3 text-[0.86rem] text-forest">
          WhatsApp isn&apos;t connected yet, so new messages won&apos;t arrive. Add the four WHATSAPP_ settings to the hosting environment.
        </p>
      )}

      <Card className="!p-0 overflow-hidden">
        {conversations.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No conversations yet">WhatsApp messages from customers will appear here.</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-forest/10">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={href({ id: c.id })}
                  aria-current={c.id === selectedId ? "true" : undefined}
                  className="grid gap-2 px-5 py-4 transition-colors hover:bg-cream/70 aria-[current=true]:bg-lime/25 md:grid-cols-[minmax(0,2fr)_auto_auto] md:items-center md:gap-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-forest">{c.profile_name ?? contactNumber(c)}</p>
                    <p className="truncate text-[0.82rem] text-ink-2">
                      {c.last_direction === "out" ? "You: " : ""}
                      {c.last_preview ?? contactNumber(c)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.unread_count > 0 && <Badge tone="design">{c.unread_count} new</Badge>}
                    {c.last_direction === "in" && c.unread_count === 0 && <Badge tone="neutral">Needs reply</Badge>}
                  </div>
                  <time dateTime={c.last_message_at} title={formatDateTime(c.last_message_at)} className="text-[0.8rem] whitespace-nowrap text-ink-2 md:text-right">
                    {relativeTime(c.last_message_at, now)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-[0.85rem] text-ink-2">
          <span>Page {page} of {pages} · {total} chats</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1, id: null })} className={buttonClass("outline", "sm")}><Icon name="chevronLeft" className="size-4" /> Newer</Link>}
            {page < pages && <Link href={href({ page: page + 1, id: null })} className={buttonClass("outline", "sm")}>Older <Icon name="chevronRight" className="size-4" /></Link>}
          </div>
        </nav>
      )}

      {selected && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="whatsapp-title">
          <Link href={href({ id: null })} scroll={false} className="absolute inset-0 bg-forest/40 backdrop-blur-[2px]" aria-label="Close chat" />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-paper shadow-2xl sm:inset-y-3 sm:right-3 sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4 border-b border-forest/10 p-6">
              <div className="min-w-0">
                <p className="eyebrow text-leaf">WhatsApp · since {formatDateTime(selected.created_at)}</p>
                <h2 id="whatsapp-title" className="mt-2 truncate font-display text-2xl font-light text-forest uppercase">
                  {selected.profile_name ?? contactNumber(selected)}
                </h2>
                <p className="mt-1 text-[0.8rem] text-ink-2">{contactNumber(selected)}</p>
              </div>
              <Link href={href({ id: null })} scroll={false} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Close">
                <Icon name="close" />
              </Link>
            </div>
            <div className="flex justify-end border-b border-forest/10 px-6 py-3">
              <DeleteWhatsAppButton conversationId={selected.id} closeHref={href({ id: null })} />
            </div>
            <WhatsAppConsole key={selected.id} conversationId={selected.id} initialLines={lines} initialLastInboundAt={selected.last_inbound_at} />
          </aside>
        </div>
      )}
    </>
  );
}
