import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { whatsappConfigured } from "@/lib/env";
import { nowMs } from "@/lib/admin/now";
import { formatDateTime, relativeTime } from "@/lib/time";
import type { WhatsAppConversation } from "@/lib/admin/types";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { DrawerAutoRefresh, DrawerLink, DrawerProvider } from "@/components/admin/drawer";
import { WhatsAppDrawer, type WhatsAppSummary } from "@/components/admin/whatsapp/WhatsAppDrawer";

export const metadata: Metadata = { title: "WhatsApp chat" };

const PAGE_SIZE = 30;
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

  // The drawer opens in the browser and loads messages from /admin/api/whatsapp.
  const COLUMNS = "id, contact_id, profile_name, unread_count, last_preview, last_direction, last_inbound_at, ai_paused_until, enquiry_id, last_message_at, created_at";
  const [listRes, linked] = await Promise.all([
    supabase
      .from("whatsapp_conversations")
      .select(COLUMNS, { count: "exact" })
      .order("last_message_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    // A conversation opened from a link, which may not be on this page of the list.
    selectedId ? supabase.from("whatsapp_conversations").select(COLUMNS).eq("id", selectedId).maybeSingle<WhatsAppConversation>() : null,
  ]);
  if (listRes.error) throw new Error(listRes.error.message);
  const conversations = (listRes.data ?? []) as WhatsAppConversation[];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summaries: Record<string, WhatsAppSummary> = {};
  for (const c of [...conversations, ...(linked?.data ? [linked.data] : [])]) {
    summaries[c.id] = {
      id: c.id,
      title: c.profile_name ?? contactNumber(c),
      number: contactNumber(c),
      enquiryId: c.enquiry_id,
      createdAt: c.created_at,
      lastInboundAt: c.last_inbound_at,
      aiPausedUntil: c.ai_paused_until,
    };
  }
  const now = nowMs();

  return (
    <DrawerProvider kind="whatsapp">
      <DrawerAutoRefresh seconds={10} />
      <PageHeader
        eyebrow="WhatsApp"
        title="WhatsApp chat"
        description="Messages sent to the business WhatsApp number appear here. The AI assistant answers customers and books a call with the team. Open a conversation to read it or reply yourself, which pauses the AI for 8 hours."
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
                <DrawerLink
                  id={c.id}
                  href={href({ id: c.id })}
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
                    {c.enquiry_id && <Badge tone="lime">Call requested</Badge>}
                    {c.unread_count > 0 && <Badge tone="design">{c.unread_count} new</Badge>}
                    {c.last_direction === "in" && c.unread_count === 0 && <Badge tone="neutral">Needs reply</Badge>}
                  </div>
                  <time dateTime={c.last_message_at} title={formatDateTime(c.last_message_at)} className="text-[0.8rem] whitespace-nowrap text-ink-2 md:text-right">
                    {relativeTime(c.last_message_at, now)}
                  </time>
                </DrawerLink>
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

      <WhatsAppDrawer summaries={summaries} />
    </DrawerProvider>
  );
}
