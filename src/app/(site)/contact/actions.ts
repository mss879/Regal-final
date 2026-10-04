"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { LOTS } from "@/lib/lots";
import { SITE } from "@/lib/site";
import { env, writesConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import { clientIp, hashKey } from "@/lib/analytics/hash";
import { formatDateTime, fromColombo } from "@/lib/time";
import { INTEREST_KEYS, type InterestKey } from "@/lib/enquiry";

export type EnquiryState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "phone" | "lot" | "message" | "visit", string>>;
  /** A problem with the whole submission (not one field). */
  formError?: string;
  values?: Record<string, string>;
  name?: string;
  /** The requested viewing, formatted in Sri Lanka time, for the thank-you message. */
  visit?: string;
};

const HOUR = 3_600_000;

const schema = z.object({
  name: z.string().min(2, "Please tell us your name.").max(120, "Please shorten your name."),
  email: z.email("Please enter a valid email address.").max(254, "Please enter a valid email address."),
  phone: z
    .string()
    .max(40, "Please check the phone number.")
    .refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), "Please check the phone number."),
  lot: z.string().refine((v) => !v || v === "any" || LOTS.some((l) => l.id === v), "Please choose a lot from the list."),
  interest: z.enum(INTEREST_KEYS).catch("prebook"),
  message: z.string().max(2000, "Please keep your message under 2,000 characters."),
  visit_date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  visit_time: z.string().regex(/^(\d{2}:\d{2})?$/),
});

export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const values = {
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    lot: get("lot"),
    interest: get("interest"),
    message: get("message"),
    visit_date: get("visit_date"),
    visit_time: get("visit_time"),
  };
  const firstName = values.name.split(" ")[0];

  // Spam traps. Bots fill the hidden "company" field, or submit within moments of the page
  // loading. Pretend it worked so they learn nothing. (started_at is set by the form's script;
  // without JavaScript it is empty and the time check is skipped.)
  const startedAt = Number(get("started_at"));
  if (get("company") || (startedAt && Date.now() - startedAt < 3000)) return { status: "success", name: firstName };

  const parsed = schema.safeParse(values);
  const errors: EnquiryState["errors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<EnquiryState["errors"]>;
      if (key in { name: 1, email: 1, phone: 1, lot: 1, message: 1 } && !errors[key]) errors[key] = issue.message;
    }
  }

  // A requested viewing: optional, but if a date is given it needs a time, at least 12 hours
  // ahead and within six months. The inputs are Sri Lanka wall-clock time.
  const interest: InterestKey = parsed.success ? parsed.data.interest : "prebook";
  let visitAt: Date | null = null;
  if (interest === "site_visit" && (values.visit_date || values.visit_time)) {
    if (!values.visit_date || !values.visit_time) errors.visit = "Please choose both a date and a time, or leave both empty.";
    else {
      visitAt = fromColombo(values.visit_date, values.visit_time);
      const ahead = visitAt.getTime() - Date.now();
      if (Number.isNaN(ahead)) errors.visit = "Please choose a valid date.";
      else if (ahead < 12 * HOUR) errors.visit = "Please choose a time at least a day from now.";
      else if (ahead > 180 * 24 * HOUR) errors.visit = "Please choose a date within the next six months.";
    }
  }

  if (Object.keys(errors).length || !parsed.success) return { status: "error", errors, values };
  const data = parsed.data;
  const visit = visitAt ? formatDateTime(visitAt) : undefined;

  if (!writesConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[enquiry] Supabase is not configured — logged only:", { ...data, visitAt });
      return { status: "success", name: firstName, visit };
    }
    console.error("[enquiry] Supabase is not configured; an enquiry could not be stored.");
    return {
      status: "error",
      values,
      formError: `Sorry — we couldn't send your enquiry just now. Please call ${SITE.phone} or email ${SITE.email}.`,
    };
  }

  const h = await headers();
  const ip = clientIp(h);
  const source = get("source_path");
  const { data: result, error } = await createServiceClient().rpc("create_website_enquiry", {
    p_submission_id: /^[0-9a-f-]{36}$/i.test(get("submission_id")) ? get("submission_id") : null,
    p_name: data.name,
    p_email: data.email,
    p_phone: data.phone,
    p_lot: data.lot,
    p_interest: interest,
    p_message: data.message,
    p_preferred_viewing_at: visitAt?.toISOString() ?? null,
    p_source_path: source.startsWith("/") ? source.slice(0, 300) : "/contact",
    p_rate_key: ip ? hashKey(env.analyticsSalt!, "enquiry", ip) : null,
  });

  if (error || !result?.ok) {
    if (result?.error === "rate_limited") {
      return {
        status: "error",
        values,
        formError: `You've sent several enquiries in a short time. Please wait a few minutes, or call us on ${SITE.phone}.`,
      };
    }
    console.error("[enquiry] could not be stored:", error?.message ?? result);
    return {
      status: "error",
      values,
      formError: `Sorry — something went wrong sending your enquiry. Please try again, or call ${SITE.phone}.`,
    };
  }

  return { status: "success", name: firstName, visit };
}
