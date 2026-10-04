import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { nowMs } from "@/lib/admin/now";
import { formatDateTime, relativeTime } from "@/lib/time";
import type { ChatLine, ChatSession, Enquiry } from "@/lib/admin/types";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { DeleteChatButton } from "@/components/admin/chats/DeleteChatButton";
import { ChatConsole } from "@/components/admin/chats/ChatConsole";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

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

  let list = supabase
    .from("chat_sessions")
    .select("id, started_path, message_count, enquiry_id, ai_paused, last_role, visitor_seen_at, created_at, last_message_at", { count: "exact" })
    .order("last_message_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (leadsOnly) list = list.not("enquiry_id", "is", null);

  const [listRes, detail] = await Promise.all([
    list,
    selectedId
      ? Promise.all([
          supabase.from("chat_sessions").select("*").eq("id", selectedId).maybeSingle<ChatSession>(),
          supabase.from("chat_messages").select("id, role, content, created_at").eq("session_id", selectedId).order("created_at").order("id"),
        ])
      : null,
  ]);
  if (listRes.error) throw new Error(listRes.error.message);
  const sessions = (listRes.data ?? []) as ChatSession[];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // First visitor message of each listed chat, as a preview.
  const ids = sessions.map((s) => s.id);
  const enquiryIds = sessions.map((s) => s.enquiry_id).filter((v): v is string => Boolean(v));
  const selected = detail?.[0].data ?? null;
  const lines = (detail?.[1].data ?? []) as ChatLine[];
  if (selected?.enquiry_id) enquiryIds.push(selected.enquiry_id);
  const [previewRes, enquiryRes] = await Promise.all([
    ids.length ? supabase.from("chat_messages").select("session_id, content, created_at").in("session_id", ids).eq("role", "user").order("created_at") : null,
    enquiryIds.length ? supabase.from("enquiries").select("id, name, email, phone").in("id", enquiryIds) : null,
  ]);
  const previews: Record<string, string> = {};
  for (const m of previewRes?.data ?? []) previews[m.session_id] ??= m.content;
  const enquiries = Object.fromEntries(((enquiryRes?.data ?? []) as Pick<Enquiry, "id" | "name" | "email" | "phone">[]).map((e) => [e.id, e]));
  const now = nowMs();
  const live = (s: ChatSession) =>
    (s.visitor_seen_at && now - new Date(s.visitor_seen_at).getTime() < 120_000) || now - new Date(s.last_message_at).getTime() < 180_000;

  return (
    <>
      {!selected && <AutoRefresh seconds={10} />}
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
              const enquiry = s.enquiry_id ? enquiries[s.enquiry_id] : null;
              return (
                <li key={s.id}>
                  <Link
                    href={href({ id: s.id })}
                    aria-current={s.id === selectedId ? "true" : undefined}
                    className="grid gap-2 px-5 py-4 transition-colors hover:bg-cream/70 aria-[current=true]:bg-lime/25 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-center md:gap-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-forest">{enquiry?.name ?? (previews[s.id] ? `“${previews[s.id]}”` : "Conversation")}</p>
                      <p className="truncate text-[0.82rem] text-ink-2">
                        {enquiry ? `“${previews[s.id] ?? ""}”` : `${s.message_count} messages`}
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
                  </Link>
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

      {selected && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="chat-title">
          <Link href={href({ id: null })} scroll={false} className="absolute inset-0 bg-forest/40 backdrop-blur-[2px]" aria-label="Close chat" />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-paper shadow-2xl sm:inset-y-3 sm:right-3 sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4 border-b border-forest/10 p-6">
              <div className="min-w-0">
                <p className="eyebrow text-leaf">Chat · {formatDateTime(selected.created_at)}</p>
                <h2 id="chat-title" className="mt-2 truncate font-display text-2xl font-light text-forest uppercase">
                  {selected.enquiry_id && enquiries[selected.enquiry_id] ? enquiries[selected.enquiry_id].name : "Website visitor"}
                </h2>
                <p className="mt-1 text-[0.8rem] text-ink-2">
                  {selected.message_count} messages{selected.started_path ? ` · started on ${selected.started_path}` : ""}
                </p>
              </div>
              <Link href={href({ id: null })} scroll={false} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Close">
                <Icon name="close" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-forest/10 px-6 py-3">
              {selected.enquiry_id ? (
                <Link href={`/admin/enquiries?tab=all&id=${selected.enquiry_id}` as Route} className={buttonClass("lime", "sm")}>
                  <Icon name="inbox" className="size-4" /> Open the enquiry
                </Link>
              ) : (
                <span className="text-[0.82rem] text-ink-2">No contact details were saved in this chat.</span>
              )}
              <span className="ml-auto">
                <DeleteChatButton sessionId={selected.id} closeHref={href({ id: null })} />
              </span>
            </div>
            <ChatConsole
              key={selected.id}
              sessionId={selected.id}
              initialLines={lines}
              initialPaused={selected.ai_paused}
              initialSeenAt={selected.visitor_seen_at}
            />
          </aside>
        </div>
      )}
    </>
  );
}
