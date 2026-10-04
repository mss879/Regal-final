"use client";

import { useActionState, useState, useTransition } from "react";
import { LOTS } from "@/lib/lots";
import { INTERESTS } from "@/lib/enquiry";
import { formatDate, formatDateTime } from "@/lib/time";
import { deleteLead, saveLead, type LeadFormState } from "@/lib/admin/actions/crm";
import { LEAD_SOURCES, viewingStatusLabel, type Lead, type Stage } from "@/lib/admin/types";
import { Modal, SubmitButton } from "@/components/admin/client";
import { FieldLabel, buttonClass, fieldClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { useViewingDialog } from "@/components/admin/viewings/ViewingDialog";
import type { NextViewing } from "./Board";

export function LeadDialog({
  editing,
  stages,
  viewing,
  onClose,
}: {
  editing: { lead?: Lead; stageId: string } | null;
  stages: Stage[];
  viewing?: NextViewing;
  onClose: () => void;
}) {
  return (
    <Modal open={editing !== null} onClose={onClose} title={editing?.lead ? editing.lead.name : "Add a lead"} wide>
      {editing && <LeadForm key={editing.lead?.id ?? `new-${editing.stageId}`} lead={editing.lead} stageId={editing.stageId} stages={stages} viewing={viewing} onDone={onClose} />}
    </Modal>
  );
}

function LeadForm({ lead, stageId, stages, viewing, onDone }: { lead?: Lead; stageId: string; stages: Stage[]; viewing?: NextViewing; onDone: () => void }) {
  const openViewing = useViewingDialog();
  const [state, action] = useActionState<LeadFormState, FormData>(async (prev, fd) => {
    const result = await saveLead(prev, fd);
    if (result.ok) onDone();
    return result;
  }, {});
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string>();
  const f = state.fields;
  const value = (name: string, fallback: string | number | null | undefined) => f?.[name] ?? (fallback == null ? "" : String(fallback));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={lead?.id ?? ""} />

      {lead && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream p-3 text-[0.82rem] text-ink-2">
          <span className="mr-auto">
            Added {formatDate(lead.created_at)} · {LEAD_SOURCES.find((s) => s.key === lead.source)?.label}
          </span>
          {viewing ? (
            <button type="button" className={buttonClass("outline", "sm")} onClick={() => openViewing({ id: viewing.id, ...viewingDraftFor(lead), starts_at: viewing.starts_at, status: viewing.status })}>
              <Icon name="calendar" className="size-4" /> {viewingStatusLabel(viewing.status)}: {formatDateTime(viewing.starts_at)}
            </button>
          ) : (
            <button type="button" className={buttonClass("lime", "sm")} onClick={() => openViewing({ ...viewingDraftFor(lead), status: "confirmed" })}>
              <Icon name="calendar" className="size-4" /> Book viewing
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Name" htmlFor="l-name">
          <input id="l-name" name="name" required defaultValue={value("name", lead?.name)} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Stage" htmlFor="l-stage">
          <select id="l-stage" name="stage_id" defaultValue={value("stage_id", lead?.stage_id ?? stageId)} className={fieldClass}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Email" htmlFor="l-email" hint="Optional">
          <input id="l-email" name="email" type="email" defaultValue={value("email", lead?.email)} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Phone" htmlFor="l-phone" hint="Optional">
          <input id="l-phone" name="phone" type="tel" defaultValue={value("phone", lead?.phone)} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Villa" htmlFor="l-lot" hint="Optional">
          <select id="l-lot" name="lot" defaultValue={value("lot", lead?.lot)} className={fieldClass}>
            <option value="">Not specified</option>
            {LOTS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Interested in" htmlFor="l-interest" hint="Optional">
          <select id="l-interest" name="interest" defaultValue={value("interest", lead?.interest)} className={fieldClass}>
            <option value="">—</option>
            {INTERESTS.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Source" htmlFor="l-source">
          <select id="l-source" name="source" defaultValue={value("source", lead?.source ?? "manual")} className={fieldClass}>
            {LEAD_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Deal value (LKR)" htmlFor="l-value" hint="Optional">
          <input id="l-value" name="value" inputMode="numeric" placeholder="e.g. 85,000,000" defaultValue={value("value", lead?.value)} className={fieldClass} />
        </FieldLabel>
      </div>
      <FieldLabel label="Notes" htmlFor="l-notes" hint="Optional">
        <textarea id="l-notes" name="notes" rows={5} defaultValue={value("notes", lead?.notes)} className={`${fieldClass} resize-y`} />
      </FieldLabel>

      {(state.error || deleteError) && (
        <p className="rounded-xl border border-sold/25 bg-sold/5 px-4 py-3 text-[0.85rem] text-sold" role="alert">{state.error ?? deleteError}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {lead ? (
          <button
            type="button"
            disabled={deleting}
            className={buttonClass("danger", "sm")}
            onClick={() => {
              if (!window.confirm(`Delete ${lead.name} from the CRM? Their enquiries stay in Enquiries.`)) return;
              startDelete(async () => {
                const r = await deleteLead(lead.id);
                if (r.ok) onDone();
                else setDeleteError(r.error);
              });
            }}
          >
            <Icon name="trash" className="size-4" /> Delete lead
          </button>
        ) : (
          <span />
        )}
        <SubmitButton pendingLabel="Saving…">{lead ? "Save changes" : "Add lead"}</SubmitButton>
      </div>
    </form>
  );
}

const viewingDraftFor = (lead: Lead) => ({
  lead_id: lead.id,
  name: lead.name,
  email: lead.email,
  phone: lead.phone,
  lot: lead.lot,
});
