"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createStage, deleteStage, reorderStages, updateStage } from "@/lib/admin/actions/crm";
import { STAGE_COLORS, type Stage, type StageColor } from "@/lib/admin/types";
import { Modal } from "@/components/admin/client";
import { DOTS, buttonClass, fieldClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

const KINDS = [
  { key: "open", label: "In progress" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

/** Add, rename, recolour, reorder and delete pipeline stages. New Leads stays locked and first. */
export function StageManager({ open, onClose, stages, counts }: { open: boolean; onClose: () => void; stages: Stage[]; counts: Record<string, number> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, then?: () => void) =>
    start(async () => {
      setError(undefined);
      const r = await fn();
      if (!r.ok) setError(r.error);
      else then?.();
    });

  const move = (index: number, by: -1 | 1) => {
    const ids = stages.map((s) => s.id);
    const target = index + by;
    if (target < 1 || target >= ids.length) return; // index 0 is New Leads
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderStages(ids));
  };

  const read = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    return { name: String(fd.get("name") ?? ""), color: String(fd.get("color") ?? "sage"), kind: String(fd.get("kind") ?? "open") };
  };

  return (
    <Modal open={open} onClose={onClose} title="Pipeline stages" wide>
      <p className="-mt-2 mb-5 text-[0.85rem] leading-relaxed text-ink-2">
        Rename, recolour, reorder or delete stages. <strong className="text-forest">New Leads</strong> is built in — it&apos;s where
        enquiries arrive, so it always stays first and can&apos;t be renamed or deleted. Deleting a stage moves its leads to New Leads.
      </p>
      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li key={`${s.id}-${s.name}-${s.color}-${s.kind}-${s.position}`} className="rounded-[18px] border border-forest/10 bg-cream/60 p-3">
            <form
              onSubmit={(e) => {
                const input = read(e);
                run(() => updateStage(s.id, input));
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <div className="flex flex-col">
                <button type="button" disabled={pending || s.is_system || i <= 1} onClick={() => move(i, -1)} className={buttonClass("ghost", "sm", "!px-1 !py-0.5")} aria-label={`Move ${s.name} left`}>
                  <Icon name="arrowUp" className="size-3.5" />
                </button>
                <button type="button" disabled={pending || s.is_system || i === stages.length - 1} onClick={() => move(i, 1)} className={buttonClass("ghost", "sm", "!px-1 !py-0.5")} aria-label={`Move ${s.name} right`}>
                  <Icon name="arrowDown" className="size-3.5" />
                </button>
              </div>
              <div className="relative min-w-40 flex-1">
                <label htmlFor={`stage-name-${s.id}`} className="sr-only">Stage name</label>
                <input
                  id={`stage-name-${s.id}`}
                  name="name"
                  defaultValue={s.name}
                  disabled={s.is_system}
                  maxLength={40}
                  required
                  className={`${fieldClass} !mt-0 ${s.is_system ? "pr-9" : ""}`}
                />
                {s.is_system && <Icon name="lock" className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2/60" />}
              </div>
              <ColorPicker name="color" defaultValue={s.color} idPrefix={s.id} />
              <label htmlFor={`stage-kind-${s.id}`} className="sr-only">Stage type</label>
              <select id={`stage-kind-${s.id}`} name="kind" defaultValue={s.kind} disabled={s.is_system} className={`${fieldClass} !mt-0 !w-auto`}>
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
              <span className="w-16 text-center text-[0.75rem] text-ink-2">{counts[s.id] ?? 0} leads</span>
              <button type="submit" disabled={pending} className={buttonClass("outline", "sm")}>Save</button>
              <button
                type="button"
                disabled={pending || s.is_system}
                className={buttonClass("danger", "sm", "!px-2")}
                aria-label={`Delete ${s.name}`}
                title={s.is_system ? "New Leads can't be deleted" : `Delete ${s.name}`}
                onClick={() => {
                  const n = counts[s.id] ?? 0;
                  if (window.confirm(`Delete the "${s.name}" stage?${n ? ` Its ${n} lead${n === 1 ? "" : "s"} will move to New Leads.` : ""}`)) {
                    run(() => deleteStage(s.id));
                  }
                }}
              >
                <Icon name="trash" className="size-4" />
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          const form = e.currentTarget;
          const input = read(e);
          run(() => createStage(input), () => form.reset());
        }}
        className="mt-6 flex flex-wrap items-center gap-2 rounded-[18px] border border-dashed border-forest/20 p-3"
      >
        <label htmlFor="new-stage-name" className="sr-only">New stage name</label>
        <input id="new-stage-name" name="name" placeholder="New stage name" maxLength={40} required className={`${fieldClass} !mt-0 min-w-40 flex-1`} />
        <ColorPicker name="color" defaultValue="sage" idPrefix="new" />
        <label htmlFor="new-stage-kind" className="sr-only">Stage type</label>
        <select id="new-stage-kind" name="kind" defaultValue="open" className={`${fieldClass} !mt-0 !w-auto`}>
          {KINDS.map((k) => (
            <option key={k.key} value={k.key}>{k.label}</option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          <Icon name="plus" className="size-4" /> Add stage
        </button>
      </form>

      {error && <p className="mt-4 rounded-xl border border-sold/25 bg-sold/5 px-4 py-3 text-[0.85rem] text-sold" role="alert">{error}</p>}
    </Modal>
  );
}

function ColorPicker({ name, defaultValue, idPrefix }: { name: string; defaultValue: StageColor; idPrefix: string }) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Colour</legend>
      {STAGE_COLORS.map((c) => (
        <label key={c} className="cursor-pointer" title={c}>
          <input type="radio" name={name} value={c} defaultChecked={c === defaultValue} id={`${idPrefix}-${c}`} className="peer sr-only" />
          <span className={`block size-5 rounded-full ${DOTS[c]} ring-offset-2 ring-offset-cream peer-checked:ring-2 peer-checked:ring-forest peer-focus-visible:ring-2 peer-focus-visible:ring-leaf`} />
          <span className="sr-only">{c}</span>
        </label>
      ))}
    </fieldset>
  );
}
