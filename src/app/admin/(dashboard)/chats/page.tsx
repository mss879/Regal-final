import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { nowMs } from "@/lib/admin/now";
import { formatDateTime, relativeTime } from "@/lib/time";
import type { ChatSession } from "@/lib/admin/types";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { DrawerAutoRefresh, DrawerLink, DrawerProvider } from "@/components/admin/drawer";
import { ChatDrawer, type ChatSummary } from "@/components/admin/chats/ChatDrawer";

export const metadata: Metadata = { title: "AI chats" };

const PAGE_SIZE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ChatsPage({ searchParams }: PageProps<"/admin/chats">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const page = Math.max(1, Number.parseInt(str(sp.page), 10) || 1);
  const leadsOnly = str(sp.filter) === "leads";
  const selectedId = UUID.test(str(sp.id)) ? str(sp.id) : null;

  const href = (params: Record<string, string | number | null>) => {
    const merged = { filter: leadsOnly ? "leads" : null, page: page > 1 ? page : null, id: selectedId, ...params };
    const s = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== null && v !== "").map(([k, v]) => [k, String(v)]));
    return `/admin/chats${s.size ? `?${s}` : ""}` as Route;
  };

  // One query: the page of chats, each with its enquiry's name and first visitor message.
  // The drawer opens in the browser and loads messages from /admin/api/chats.
  const COLUMNS =
    "id, started_path, message_count, enquiry_id, ai_paused, last_role, visitor_seen_at, created_at, last_message_at, enquiry:enquiries!chat_sessions_enquiry_id_fkey(name), preview:chat_messages(content)";
  type Row = ChatSession & { enquiry: { name: string } | null; preview: { content: string }[] };
  const query = () =>
    supabase
      .from("chat_sessions")
      .select(COLUMNS, { count: "exact" })
      .eq("preview.role", "user")
      .order("id", { referencedTable: "preview" })
      .limit(1, { referencedTable: "preview" });

  let list = query()
    .order("last_message_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (leadsOnly) list = list.not("enquiry_id", "is", null);

  const [listRes, linked] = await Promise.all([
    list,
    // A chat opened from a link (e.g. on an enquiry), which may not be on this page of the list.
    selectedId ? query().eq("id", selectedId).maybeSingle() : null,
  ]);
  if (listRes.error) throw new Error(listRes.error.message);
  const sessions = (listRes.data ?? []) as unknown as Row[];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summaries: Record<string, ChatSummary> = {};
  for (const s of [...sessions, ...(linked?.data ? [linked.data as unknown as Row] : [])]) {
    summaries[s.id] = {
      id: s.id,
      name: s.enquiry?.name ?? null,
      enquiryId: s.enquiry_id,
      messageCount: s.message_count,
      startedPath: s.started_path,
      createdAt: s.created_at,
      aiPaused: s.ai_paused,
      visitorSeenAt: s.visitor_seen_at,
    };
  }
  const now = nowMs();
  const live = (s: ChatSession) =>
    (s.visitor_seen_at && now - new Date(s.visitor_seen_at).getTime() < 120_000) || now - new Date(s.last_message_at).getTime() < 180_000;

  return (
    <DrawerProvider kind="chats">
      <DrawerAutoRefresh seconds={10} />
      <PageHeader
        eyebrow="AI assistant"
        title="AI chats"
        description="Every conversation with the website's AI assistant is saved here. Open a chat to read it live, switch the AI off and reply yourself. When a visitor shares their details, the assistant saves them as an enquiry (and a viewing request if they ask for one)."
      />

      <nav aria-label="Filter chats" className="mb-5 flex w-fit gap-1 rounded-full bg-paper p-1">
        {[
          { key: null, label: "All chats" },
          { key: "leads", label: "With details saved" },
        ].map((t) => (
          <Link
            key={t.label}
            href={href({ filter: t.key, page: null, id: null })}
            aria-current={(t.key === "leads") === leadsOnly ? "page" : undefined}
            className="rounded-full px-4 py-2 text-[0.85rem] text-ink-2 transition-colors hover:text-forest aria-[current=page]:bg-forest aria-[current=page]:text-paper"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Card className="!p-0 overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No conversations yet">Chats from the assistant on the website will appear here.</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-forest/10">
            {sessions.map((s) => {
              const enquiry = s.enquiry;
              const preview = s.preview[0]?.content;
              return (
                <li key={s.id}>
                  <DrawerLink
                    id={s.id}
                    href={href({ id: s.id })}
                    className="grid gap-2 px-5 py-4 transition-colors hover:bg-cream/70 aria-[current=true]:bg-lime/25 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-center md:gap-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-forest">{enquiry?.name ?? (preview ? `“${preview}”` : "Conversation")}</p>
                      <p className="truncate text-[0.82rem] text-ink-2">
                        {enquiry ? `“${preview ?? ""}”` : `${s.message_count} messages`}
                        {s.started_path ? ` · started on ${s.started_path}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {live(s) && (
                        <Badge tone="leaf">
                          <span className="size-1.5 animate-pulse rounded-full bg-paper motion-reduce:animate-none" /> Live
                        </Badge>
                      )}
                      {s.ai_paused && s.last_role === "user" && <Badge tone="design">Needs reply</Badge>}
                      {s.ai_paused && <Badge tone="forest">AI off</Badge>}
                      {enquiry ? <Badge tone="lime">Details saved</Badge> : <Badge tone="neutral">{s.message_count} messages</Badge>}
                    </div>
                    <time dateTime={s.last_message_at} title={formatDateTime(s.last_message_at)} className="text-[0.8rem] whitespace-nowrap text-ink-2 md:text-right">
                      {relativeTime(s.last_message_at, now)}
                    </time>
                  </DrawerLink>
                </li>
              );
            })}
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

      <ChatDrawer summaries={summaries} />
    </DrawerProvider>
  );
}
