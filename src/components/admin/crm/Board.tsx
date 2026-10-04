"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveLead } from "@/lib/admin/actions/crm";
import { interestLabel } from "@/lib/enquiry";
import { formatCompact, lotLabel } from "@/lib/admin/format";
import { formatDayMonth, formatTime } from "@/lib/time";
import type { Lead, Stage, ViewingStatus } from "@/lib/admin/types";
import { Badge, DOTS, buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { LeadDialog } from "./LeadDialog";
import { StageManager } from "./StageManager";

export type NextViewing = { id: string; starts_at: string; status: ViewingStatus };
type Columns = Record<string, Lead[]>;

function toColumns(stages: Stage[], leads: Lead[]): Columns {
  const cols: Columns = Object.fromEntries(stages.map((s) => [s.id, [] as Lead[]]));
  for (const l of [...leads].sort((a, b) => a.position - b.position)) cols[l.stage_id]?.push(l);
  return cols;
}

function findColumn(cols: Columns, id: UniqueIdentifier): string | null {
  if (id in cols) return String(id);
  return Object.keys(cols).find((k) => cols[k].some((l) => l.id === id)) ?? null;
}

export function Board({
  stages,
  leads,
  nextViewings,
  openLeadId,
}: {
  stages: Stage[];
  leads: Lead[];
  nextViewings: Record<string, NextViewing>;
  openLeadId?: string;
}) {
  const server = useMemo(() => toColumns(stages, leads), [stages, leads]);
  const [optimistic, setOptimistic] = useOptimistic(server);
  const [drag, setDrag] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ lead?: Lead; stageId: string } | null>(() => {
    const lead = openLeadId ? leads.find((l) => l.id === openLeadId) : undefined;
    return lead ? { lead, stageId: lead.stage_id } : null;
  });
  const [managing, setManaging] = useState(false);

  const columns = drag ?? optimistic;
  const newLeads = stages.find((s) => s.is_system) ?? stages[0];
  const activeLead = activeId ? Object.values(columns).flat().find((l) => l.id === activeId) : undefined;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart({ active }: DragStartEvent) {
    setError(undefined);
    setActiveId(String(active.id));
    setDrag(optimistic);
  }

  // Moving between columns updates the preview as the card crosses over.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDrag((prev) => {
      const cols = prev ?? optimistic;
      const from = findColumn(cols, active.id);
      const to = findColumn(cols, over.id);
      if (!from || !to || from === to) return prev;
      const lead = cols[from].find((l) => l.id === active.id)!;
      const target = cols[to];
      const overIndex = target.findIndex((l) => l.id === over.id);
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...cols,
        [from]: cols[from].filter((l) => l.id !== active.id),
        [to]: [...target.slice(0, index), { ...lead, stage_id: to }, ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const cols = drag ?? optimistic;
    setActiveId(null);
    setDrag(null);
    if (!over) return;
    const to = findColumn(cols, over.id);
    if (!to) return;
    const items = cols[to];
    const oldIndex = items.findIndex((l) => l.id === active.id);
    const overIndex = over.id === to ? items.length - 1 : items.findIndex((l) => l.id === over.id);
    const ordered = oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex ? arrayMove(items, oldIndex, overIndex) : items;
    const index = ordered.findIndex((l) => l.id === active.id);

    const before = findColumn(optimistic, active.id);
    const beforeIndex = before ? optimistic[before].findIndex((l) => l.id === active.id) : -1;
    if (before === to && beforeIndex === index) return;

    const final = { ...cols, [to]: ordered.map((l) => (l.id === active.id ? { ...l, stage_id: to } : l)) };
    startTransition(async () => {
      setOptimistic(final);
      const result = await moveLead(String(active.id), to, index);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.85rem] text-ink-2">
          Drag cards between stages. Enquiries you move to the CRM arrive in <strong className="text-forest">{newLeads?.name}</strong>.
        </p>
        <div className="flex gap-2">
          <button type="button" className={buttonClass("outline")} onClick={() => setManaging(true)}>
            <Icon name="settings" className="size-4" /> Manage stages
          </button>
          <button type="button" className={buttonClass("primary")} onClick={() => newLeads && setEditing({ stageId: newLeads.id })}>
            <Icon name="plus" className="size-4" /> Add lead
          </button>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded-xl border border-sold/25 bg-sold/5 px-4 py-3 text-[0.85rem] text-sold" role="alert">
          {error} The board has been reset to the saved order.
        </p>
      )}

      <DndContext
        id="crm-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDrag(null);
        }}
      >
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-4 md:gap-4">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              leads={columns[stage.id] ?? []}
              nextViewings={nextViewings}
              onAdd={() => setEditing({ stageId: stage.id })}
              onOpen={(lead) => setEditing({ lead, stageId: lead.stage_id })}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {activeLead ? <CardBody lead={activeLead} viewing={nextViewings[activeLead.id]} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <LeadDialog editing={editing} stages={stages} viewing={editing?.lead ? nextViewings[editing.lead.id] : undefined} onClose={() => setEditing(null)} />
      <StageManager open={managing} onClose={() => setManaging(false)} stages={stages} counts={Object.fromEntries(stages.map((s) => [s.id, (optimistic[s.id] ?? []).length]))} />
    </>
  );
}

function Column({
  stage,
  leads,
  nextViewings,
  onAdd,
  onOpen,
}: {
  stage: Stage;
  leads: Lead[];
  nextViewings: Record<string, NextViewing>;
  onAdd: () => void;
  onOpen: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = leads.reduce((sum, l) => sum + (l.value ?? 0), 0);
  return (
    <section aria-labelledby={`stage-${stage.id}`} className="flex w-[290px] shrink-0 snap-start flex-col rounded-[24px] bg-paper/70 p-3">
      <header className="mb-3 flex items-center gap-2 px-1.5 pt-1">
        <span className={`size-2.5 shrink-0 rounded-full ${DOTS[stage.color]}`} />
        <h2 id={`stage-${stage.id}`} className="truncate font-display text-[1.05rem] text-forest">{stage.name}</h2>
        {stage.is_system && (
          <span title="Built-in stage: can't be renamed or deleted" className="text-ink-2/60">
            <Icon name="lock" className="size-3.5" />
            <span className="sr-only">Built-in stage</span>
          </span>
        )}
        <span className="rounded-full bg-forest/[0.07] px-2 text-[0.72rem] font-semibold text-ink-2">{leads.length}</span>
        <button type="button" onClick={onAdd} className={buttonClass("ghost", "sm", "ml-auto !px-1.5")} aria-label={`Add a lead to ${stage.name}`}>
          <Icon name="plus" className="size-4" />
        </button>
      </header>
      {total > 0 && <p className="-mt-2 mb-2 px-1.5 text-[0.72rem] text-ink-2">LKR {formatCompact(total)} in this stage</p>}
      <SortableContext id={stage.id} items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={`flex min-h-24 flex-1 flex-col gap-2 rounded-[18px] p-0.5 transition-colors ${isOver ? "bg-lime/25" : ""}`}
        >
          {leads.map((lead) => (
            <SortableCard key={lead.id} lead={lead} viewing={nextViewings[lead.id]} onOpen={() => onOpen(lead)} />
          ))}
          {leads.length === 0 && (
            <li className="flex flex-1 items-center justify-center rounded-[16px] border border-dashed border-forest/15 px-3 py-6 text-center text-[0.78rem] text-ink-2/80">
              Drop leads here
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

function SortableCard({ lead, viewing, onOpen }: { lead: Lead; viewing?: NextViewing; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  // Mouse and touch drag the whole card; the keyboard drags with the grip button.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
      {...pointerListeners}
    >
      <CardBody
        lead={lead}
        viewing={viewing}
        onOpen={onOpen}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined}
            aria-label={`Move ${lead.name}`}
            className="-m-1 cursor-grab touch-none rounded-lg p-1 text-ink-2/50 hover:text-forest focus-visible:text-forest"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="currentColor">
              {[5, 10, 15].flatMap((y) => [7, 13].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
            </svg>
          </button>
        }
      />
    </li>
  );
}

function CardBody({
  lead,
  viewing,
  onOpen,
  handle,
  overlay,
}: {
  lead: Lead;
  viewing?: NextViewing;
  onOpen?: () => void;
  handle?: React.ReactNode;
  overlay?: boolean;
}) {
  const lot = lotLabel(lead.lot);
  return (
    <div
      className={`group rounded-[16px] border border-forest/10 bg-paper p-3.5 transition-shadow ${overlay ? "rotate-1 cursor-grabbing shadow-xl" : "cursor-grab hover:shadow-md"}`}
    >
      <div className="flex items-start gap-2">
        {handle ?? <span className="size-4" />}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-semibold text-forest group-hover:text-leaf">{lead.name}</span>
          {(lot || lead.interest) && (
            <span className="mt-0.5 block truncate text-[0.78rem] text-ink-2">
              {[lot, lead.interest ? interestLabel(lead.interest) : null].filter(Boolean).join(" · ")}
            </span>
          )}
        </button>
        {lead.value != null && <span className="shrink-0 text-[0.72rem] font-semibold text-forest">{formatCompact(lead.value)}</span>}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6">
        {viewing && (
          <Badge tone={viewing.status === "requested" ? "design" : "leaf"} className="!font-medium">
            <Icon name="calendar" className="size-3" /> {formatDayMonth(viewing.starts_at)}, {formatTime(viewing.starts_at)}
          </Badge>
        )}
        {lead.source === "website" && <Badge tone="neutral" className="!font-medium">Website</Badge>}
        {lead.notes && (
          <span className="text-ink-2/60" title="Has notes">
            <Icon name="edit" className="size-3.5" />
            <span className="sr-only">Has notes</span>
          </span>
        )}
      </div>
    </div>
  );
}
