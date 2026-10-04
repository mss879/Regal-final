"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEnquiry, moveEnquiryToCrm, setEnquiryStatus } from "@/lib/admin/actions/enquiries";
import type { Enquiry, Viewing } from "@/lib/admin/types";
import { buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { ViewingTrigger } from "@/components/admin/viewings/ViewingDialog";

export function EnquiryActions({ enquiry, viewing, closeHref }: { enquiry: Enquiry; viewing: Viewing | null; closeHref: Route }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(undefined);
      const r = await fn();
      if (!r.ok) setError(r.error);
      else after?.();
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {enquiry.lead_id ? (
          <Link href={`/admin/crm?lead=${enquiry.lead_id}` as Route} className={buttonClass("primary")}>
            <Icon name="kanban" className="size-4" /> View in CRM
          </Link>
        ) : (
          <button type="button" disabled={pending} className={buttonClass("lime")} onClick={() => run(() => moveEnquiryToCrm(enquiry.id))}>
            <Icon name="move" className="size-4" /> Move to CRM
          </button>
        )}
        {viewing ? (
          <ViewingTrigger draft={viewing} className={buttonClass("outline")}>
            <Icon name="calendar" className="size-4" /> {viewing.status === "requested" ? "Review viewing request" : "Open viewing"}
          </ViewingTrigger>
        ) : (
          <ViewingTrigger
            draft={{
              enquiry_id: enquiry.id,
              lead_id: enquiry.lead_id,
              name: enquiry.name,
              email: enquiry.email,
              phone: enquiry.phone,
              lot: enquiry.lot,
              starts_at: enquiry.preferred_viewing_at ?? undefined,
              status: "confirmed",
            }}
            className={buttonClass("outline")}
          >
            <Icon name="calendar" className="size-4" /> Book viewing
          </ViewingTrigger>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {enquiry.status === "new" && (
          <button type="button" disabled={pending} className={buttonClass("ghost", "sm")} onClick={() => run(() => setEnquiryStatus(enquiry.id, "read"))}>
            <Icon name="check" className="size-4" /> Mark as read
          </button>
        )}
        {enquiry.status === "read" && (
          <button type="button" disabled={pending} className={buttonClass("ghost", "sm")} onClick={() => run(() => setEnquiryStatus(enquiry.id, "new"))}>
            <Icon name="undo" className="size-4" /> Mark as new
          </button>
        )}
        {enquiry.status === "archived" ? (
          <button type="button" disabled={pending} className={buttonClass("ghost", "sm")} onClick={() => run(() => setEnquiryStatus(enquiry.id, "read"))}>
            <Icon name="undo" className="size-4" /> Restore
          </button>
        ) : (
          <button type="button" disabled={pending} className={buttonClass("ghost", "sm")} onClick={() => run(() => setEnquiryStatus(enquiry.id, "archived"))}>
            <Icon name="archive" className="size-4" /> Archive
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          className={buttonClass("danger", "sm", "ml-auto")}
          onClick={() => {
            if (window.confirm(`Delete the enquiry from ${enquiry.name}? This can't be undone.`)) {
              run(() => deleteEnquiry(enquiry.id), () => router.replace(closeHref));
            }
          }}
        >
          <Icon name="trash" className="size-4" /> Delete
        </button>
      </div>
      {error && <p className="text-[0.82rem] text-sold" role="alert">{error}</p>}
    </div>
  );
}
