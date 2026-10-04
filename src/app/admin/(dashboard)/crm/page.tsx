import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { nowIso } from "@/lib/admin/now";
import type { Lead, Stage } from "@/lib/admin/types";
import { PageHeader } from "@/components/admin/ui";
import { Board, type NextViewing } from "@/components/admin/crm/Board";

export const metadata: Metadata = { title: "CRM pipeline" };

export default async function CrmPage({ searchParams }: PageProps<"/admin/crm">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const [stagesRes, leadsRes, viewingsRes] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name, color, position, kind, is_system").order("position"),
    supabase
      .from("leads")
      .select("id, stage_id, position, name, email, phone, lot, interest, source, value, notes, created_at, updated_at")
      .order("position"),
    supabase
      .from("viewings")
      .select("id, lead_id, starts_at, status")
      .not("lead_id", "is", null)
      .in("status", ["requested", "confirmed"])
      .gte("starts_at", nowIso())
      .order("starts_at"),
  ]);
  if (stagesRes.error) throw new Error(stagesRes.error.message);
  if (leadsRes.error) throw new Error(leadsRes.error.message);

  // The next upcoming viewing per lead, shown on its card.
  const nextViewings: Record<string, NextViewing> = {};
  for (const v of viewingsRes.data ?? []) if (v.lead_id && !nextViewings[v.lead_id]) nextViewings[v.lead_id] = v as NextViewing;

  const leads = (leadsRes.data ?? []) as Lead[];
  return (
    <>
      <PageHeader eyebrow="CRM" title="Sales pipeline" description={`${leads.length} lead${leads.length === 1 ? "" : "s"} across ${stagesRes.data?.length ?? 0} stages.`} />
      <Board
        stages={(stagesRes.data ?? []) as Stage[]}
        leads={leads}
        nextViewings={nextViewings}
        openLeadId={typeof sp.lead === "string" ? sp.lead : undefined}
      />
    </>
  );
}
