import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { interestLabel } from "@/lib/enquiry";
import { lotLabel } from "@/lib/admin/format";
import { formatDateTime, relativeTime } from "@/lib/time";
import { nowMs } from "@/lib/admin/now";
import type { Enquiry, Viewing } from "@/lib/admin/types";
import { Badge, Card, EmptyState, PageHeader, buttonClass, fieldClass, type Tone } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { EnquiryActions } from "@/components/admin/enquiries/EnquiryActions";
import { VIEWING_TONE } from "@/components/admin/viewings/ViewingDialog";

export const metadata: Metadata = { title: "Enquiries" };

const PAGE_SIZE = 25;
const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "new", label: "New" },
  { key: "crm", label: "In CRM" },
  { key: "archived", label: "Archived" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const STATUS_TONE: Record<Enquiry["status"], Tone> = { new: "lime", read: "neutral", archived: "outline" };
const INTEREST_TONE: Record<string, Tone> = { site_visit: "leaf", prebook: "forest", pricing: "sage", other: "neutral" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const tab: Tab = (TABS.find((t) => t.key === str(sp.tab))?.key ?? "inbox") as Tab;
  // PostgREST filter syntax uses , ( ) and % — strip them from the search text.
  const q = str(sp.q).replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(str(sp.page), 10) || 1);
  const selectedId = UUID.test(str(sp.id)) ? str(sp.id) : null;

  const href = (params: Record<string, string | number | null>) => {
    const merged = { tab: tab === "inbox" ? null : tab, q: q || null, page: page > 1 ? page : null, id: selectedId, ...params };
    const s = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== null && v !== "").map(([k, v]) => [k, String(v)]));
    return `/admin/enquiries${s.size ? `?${s}` : ""}` as Route;
  };

  let list = supabase
    .from("enquiries")
    .select("id, name, email, phone, lot, interest, message, preferred_viewing_at, source_path, status, lead_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (tab === "inbox") list = list.neq("status", "archived");
  if (tab === "new") list = list.eq("status", "new");
  if (tab === "crm") list = list.not("lead_id", "is", null);
  if (tab === "archived") list = list.eq("status", "archived");
  if (q) list = list.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,message.ilike.%${q}%`);

  const count = (fn: (b: ReturnType<typeof base>) => ReturnType<typeof base>) => fn(base()).then((r) => r.count ?? 0);
  function base() {
    return supabase.from("enquiries").select("id", { count: "exact", head: true });
  }

  const [listRes, counts, selected] = await Promise.all([
    list,
    Promise.all([
      count((b) => b.neq("status", "archived")),
      count((b) => b.eq("status", "new")),
      count((b) => b.not("lead_id", "is", null)),
      count((b) => b.eq("status", "archived")),
    ]),
    selectedId
      ? Promise.all([
          supabase.from("enquiries").select("*").eq("id", selectedId).maybeSingle<Enquiry>(),
          supabase.from("viewings").select("*").eq("enquiry_id", selectedId).order("starts_at", { ascending: false }).limit(1).maybeSingle<Viewing>(),
        ])
      : null,
  ]);

  if (listRes.error) throw new Error(listRes.error.message);
  const enquiries = (listRes.data ?? []) as Enquiry[];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = selected?.[0].data ?? null;
  const currentViewing = selected?.[1].data ?? null;
  const now = nowMs();

  return (
    <>
      <PageHeader
        eyebrow="Enquiries"
        title="Enquiries"
        description="Every contact-form submission from the website. Move serious enquiries into the CRM to work them through the pipeline."
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Filter enquiries" className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-paper p-1">
          {TABS.map((t, i) => (
            <Link
              key={t.key}
              href={href({ tab: t.key === "inbox" ? null : t.key, page: null, id: null })}
              aria-current={tab === t.key ? "page" : undefined}
              className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[0.85rem] text-ink-2 transition-colors hover:text-forest aria-[current=page]:bg-forest aria-[current=page]:text-paper"
            >
              {t.label}
              <span className="rounded-full bg-forest/10 px-1.5 text-[0.7rem] font-semibold">{counts[i]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin/enquiries" className="flex gap-2" role="search">
          {tab !== "inbox" && <input type="hidden" name="tab" value={tab} />}
          <label htmlFor="q" className="sr-only">Search enquiries</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search name, email, phone…" className={`${fieldClass} !mt-0 w-full md:w-72`} />
          <button type="submit" className={buttonClass("outline")} aria-label="Search">
            <Icon name="search" className="size-4" />
          </button>
        </form>
      </div>

      <Card className="!p-0 overflow-hidden">
        {enquiries.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q ? "No matches" : "Nothing here yet"}>
              {q ? "Try a different search." : "New enquiries from the website contact form will appear here."}
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-forest/10">
            {enquiries.map((e) => (
              <li key={e.id}>
                <Link
                  href={href({ id: e.id })}
                  aria-current={e.id === selectedId ? "true" : undefined}
                  className="grid gap-2 px-5 py-4 transition-colors hover:bg-cream/70 aria-[current=true]:bg-lime/25 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-6"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold text-forest">
                      {e.status === "new" && <span className="size-2 shrink-0 rounded-full bg-leaf" aria-label="New" />}
                      {e.name}
                    </p>
                    <p className="truncate text-[0.82rem] text-ink-2">{e.email}{e.phone ? ` · ${e.phone}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={INTEREST_TONE[e.interest] ?? "neutral"}>{interestLabel(e.interest)}</Badge>
                    {e.lot && <Badge tone="outline">{lotLabel(e.lot)}</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[0.8rem] text-ink-2">
                    {e.lead_id && <Badge tone="forest">In CRM</Badge>}
                    {e.status === "archived" && <Badge tone={STATUS_TONE.archived}>Archived</Badge>}
                    {e.preferred_viewing_at && (
                      <span className="inline-flex items-center gap-1"><Icon name="calendar" className="size-3.5" /> {formatDateTime(e.preferred_viewing_at)}</span>
                    )}
                  </div>
                  <time dateTime={e.created_at} className="text-[0.8rem] whitespace-nowrap text-ink-2 md:text-right" title={formatDateTime(e.created_at)}>
                    {relativeTime(e.created_at, now)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-[0.85rem] text-ink-2">
          <span>Page {page} of {pages} · {total} enquiries</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1, id: null })} className={buttonClass("outline", "sm")}><Icon name="chevronLeft" className="size-4" /> Newer</Link>}
            {page < pages && <Link href={href({ page: page + 1, id: null })} className={buttonClass("outline", "sm")}>Older <Icon name="chevronRight" className="size-4" /></Link>}
          </div>
        </nav>
      )}

      {current && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="enquiry-title">
          <Link href={href({ id: null })} className="absolute inset-0 bg-forest/40 backdrop-blur-[2px]" aria-label="Close enquiry" scroll={false} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto bg-paper shadow-2xl sm:inset-y-3 sm:right-3 sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4 border-b border-forest/10 p-6">
              <div className="min-w-0">
                <p className="eyebrow text-leaf">Enquiry · {relativeTime(current.created_at, now)}</p>
                <h2 id="enquiry-title" className="mt-2 truncate font-display text-3xl font-light text-forest uppercase">{current.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={STATUS_TONE[current.status]}>{current.status === "new" ? "New" : current.status === "read" ? "Read" : "Archived"}</Badge>
                  <Badge tone={INTEREST_TONE[current.interest] ?? "neutral"}>{interestLabel(current.interest)}</Badge>
                  {current.lead_id && <Badge tone="forest">In CRM</Badge>}
                </div>
              </div>
              <Link href={href({ id: null })} scroll={false} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Close">
                <Icon name="close" />
              </Link>
            </div>

            <div className="space-y-6 p-6">
              <EnquiryActions enquiry={current} viewing={currentViewing} closeHref={href({ id: null })} />

              <dl className="grid gap-x-6 gap-y-4 rounded-[20px] bg-cream p-5 text-[0.9rem] sm:grid-cols-2">
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.14em] text-ink-2 uppercase">Email</dt>
                  <dd className="mt-1 break-all"><a href={`mailto:${current.email}`} className="text-forest underline decoration-leaf-2 underline-offset-4">{current.email}</a></dd>
                </div>
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.14em] text-ink-2 uppercase">Phone</dt>
                  <dd className="mt-1">{current.phone ? <a href={`tel:${current.phone.replace(/[^\d+]/g, "")}`} className="text-forest underline decoration-leaf-2 underline-offset-4">{current.phone}</a> : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.14em] text-ink-2 uppercase">Villa</dt>
                  <dd className="mt-1 text-forest">{lotLabel(current.lot) ?? "Any / not sure"}</dd>
                </div>
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.14em] text-ink-2 uppercase">Received</dt>
                  <dd className="mt-1 text-forest">{formatDateTime(current.created_at)}</dd>
                </div>
                {current.preferred_viewing_at && (
                  <div className="sm:col-span-2">
                    <dt className="text-[0.68rem] font-semibold tracking-[0.14em] text-ink-2 uppercase">Preferred viewing</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 text-forest">
                      {formatDateTime(current.preferred_viewing_at)} (Sri Lanka time)
                      {currentViewing && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${VIEWING_TONE[currentViewing.status]}`}>{currentViewing.status.replace("_", "-")}</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>

              <div>
                <h3 className="eyebrow text-ink-2">Message</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed whitespace-pre-line text-forest">{current.message || <span className="text-ink-2">No message.</span>}</p>
              </div>
              {current.source_path && <p className="text-[0.75rem] text-ink-2">Sent from {current.source_path}</p>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
