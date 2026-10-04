"use client";

import { createContext, useActionState, useContext, useState, useTransition, type ReactNode } from "react";
import { LOTS } from "@/lib/lots";
import { colomboDateKey, colomboTimeKey, formatDateTime } from "@/lib/time";
import { deleteViewing, saveViewing, setViewingStatus, type ViewingFormState } from "@/lib/admin/actions/viewings";
import { VIEWING_STATUSES, type Viewing, type ViewingStatus } from "@/lib/admin/types";
import { Modal, SubmitButton } from "@/components/admin/client";
import { FieldLabel, buttonClass, fieldClass } from "@/components/admin/ui";

/** What the dialog opens with: an existing viewing, or a pre-filled new one. */
export type ViewingDraft = Partial<Omit<Viewing, "starts_at">> & { starts_at?: string; date?: string; time?: string };

const Ctx = createContext<((draft: ViewingDraft) => void) | null>(null);

export function useViewingDialog() {
  const open = useContext(Ctx);
  if (!open) throw new Error("useViewingDialog must be used inside <ViewingDialogProvider>");
  return open;
}

export function ViewingDialogProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ViewingDraft | null>(null);
  const [key, setKey] = useState(0);
  const open = (d: ViewingDraft) => {
    setKey((k) => k + 1);
    setDraft(d);
  };
  const close = () => setDraft(null);
  return (
    <Ctx.Provider value={open}>
      {children}
      <Modal open={draft !== null} onClose={close} title={draft?.id ? "Edit viewing" : "Book a viewing"}>
        {draft && <ViewingForm key={key} draft={draft} onDone={close} />}
      </Modal>
    </Ctx.Provider>
  );
}

/** Button that opens the viewing dialog (usable from Server Components). */
export function ViewingTrigger({ draft, className, children, title }: { draft: ViewingDraft; className?: string; children: ReactNode; title?: string }) {
  const open = useViewingDialog();
  return (
    <button type="button" className={className} title={title} onClick={() => open(draft)}>
      {children}
    </button>
  );
}

const DURATIONS = [30, 45, 60, 90, 120, 180];

function ViewingForm({ draft, onDone }: { draft: ViewingDraft; onDone: () => void }) {
  const [state, action] = useActionState<ViewingFormState, FormData>(async (prev, fd) => {
    const result = await saveViewing(prev, fd);
    if (result.ok) onDone();
    return result;
  }, {});
  const [busy, startTransition] = useTransition();
  const [quickError, setQuickError] = useState<string>();

  const f = state.fields;
  const value = (name: string, fallback: string | number | null | undefined) => f?.[name] ?? (fallback == null ? "" : String(fallback));
  const date = draft.date ?? (draft.starts_at ? colomboDateKey(draft.starts_at) : "");
  const time = draft.time ?? (draft.starts_at ? colomboTimeKey(draft.starts_at) : "10:00");

  const quick = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) onDone();
      else setQuickError(r.error);
    });

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={draft.id ?? ""} />
      <input type="hidden" name="lead_id" value={draft.lead_id ?? ""} />
      <input type="hidden" name="enquiry_id" value={draft.enquiry_id ?? ""} />

      {draft.id && draft.starts_at && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream p-3">
          <span className="mr-auto text-[0.85rem] text-ink-2">{formatDateTime(draft.starts_at)}</span>
          {draft.status === "requested" && (
            <button type="button" disabled={busy} className={buttonClass("lime", "sm")} onClick={() => quick(() => setViewingStatus(draft.id!, "confirmed"))}>
              Confirm
            </button>
          )}
          {(draft.status === "requested" || draft.status === "confirmed") && (
            <>
              <button type="button" disabled={busy} className={buttonClass("outline", "sm")} onClick={() => quick(() => setViewingStatus(draft.id!, "completed"))}>
                Completed
              </button>
              <button type="button" disabled={busy} className={buttonClass("ghost", "sm")} onClick={() => quick(() => setViewingStatus(draft.id!, "cancelled"))}>
                Cancel viewing
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Name" htmlFor="v-name">
          <input id="v-name" name="name" required defaultValue={value("name", draft.name)} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Villa" htmlFor="v-lot" hint="Optional">
          <select id="v-lot" name="lot" defaultValue={value("lot", draft.lot)} className={fieldClass}>
            <option value="">Not specified</option>
            {LOTS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Email" htmlFor="v-email" hint="Optional">
          <input id="v-email" name="email" type="email" defaultValue={value("email", draft.email)} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Phone" htmlFor="v-phone" hint="Optional">
          <input id="v-phone" name="phone" type="tel" defaultValue={value("phone", draft.phone)} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Date" htmlFor="v-date">
          <input id="v-date" name="date" type="date" required defaultValue={value("date", date)} className={fieldClass} />
        </FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Time" htmlFor="v-time" hint="SL time">
            <input id="v-time" name="time" type="time" step={900} required defaultValue={value("time", time)} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Length" htmlFor="v-duration">
            <select id="v-duration" name="duration_minutes" defaultValue={value("duration_minutes", draft.duration_minutes ?? 60)} className={fieldClass}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>
              ))}
            </select>
          </FieldLabel>
        </div>
        <FieldLabel label="Status" htmlFor="v-status">
          <select id="v-status" name="status" defaultValue={value("status", draft.status ?? "confirmed")} className={fieldClass}>
            {VIEWING_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </FieldLabel>
      </div>
      <FieldLabel label="Notes" htmlFor="v-notes" hint="Optional">
        <textarea id="v-notes" name="notes" rows={3} defaultValue={value("notes", draft.notes)} className={`${fieldClass} resize-y`} />
      </FieldLabel>

      {(state.error || quickError) && (
        <p className="rounded-xl border border-sold/25 bg-sold/5 px-4 py-3 text-[0.85rem] text-sold" role="alert">{state.error ?? quickError}</p>
      )}
      {state.warning && (
        <p className="rounded-xl border border-design/30 bg-design/10 px-4 py-3 text-[0.85rem] text-forest" role="alert">{state.warning}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {draft.id ? (
          <button
            type="button"
            disabled={busy}
            className={buttonClass("danger", "sm")}
            onClick={() => {
              if (window.confirm("Delete this viewing?")) quick(() => deleteViewing(draft.id!));
            }}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {state.warning ? (
            <SubmitButton name="force" value="1" variant="lime" pendingLabel="Saving…">Save anyway</SubmitButton>
          ) : (
            <SubmitButton pendingLabel="Saving…">{draft.id ? "Save changes" : "Book viewing"}</SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}

export const VIEWING_TONE: Record<ViewingStatus, string> = {
  requested: "border border-dashed border-design bg-design/10 text-forest",
  confirmed: "bg-leaf text-paper",
  completed: "bg-sage-2 text-forest",
  cancelled: "bg-forest/[0.06] text-ink-2 line-through",
  no_show: "bg-sold/10 text-sold line-through",
};
