import type { Route } from "next";
import type { IconName } from "@/components/admin/icons";

// Every admin feature in one list: it drives the sidebar and the overview cards on the
// dashboard. To add a feature, add its route under src/app/admin/(dashboard) and an entry here
// (plus a `stats` function if it should show numbers on the dashboard).
export type DashboardSummary = {
  enquiries_new: number;
  enquiries_7d: number;
  enquiries_total: number;
  leads_open: number;
  leads_new: number;
  leads_won: number;
  pipeline_value: number;
  viewings_upcoming: number;
  viewings_requested: number;
  viewings_today: number;
  chats_7d: number;
  chats_with_enquiry: number;
};

export type AdminFeature = {
  key: string;
  href: Route;
  label: string;
  description: string;
  icon: IconName;
  stats?: (s: DashboardSummary) => { value: number | string; label: string }[];
};

export const ADMIN_FEATURES: AdminFeature[] = [
  {
    key: "dashboard",
    href: "/admin",
    label: "Dashboard",
    description: "Traffic, latest activity and upcoming viewings.",
    icon: "dashboard",
  },
  {
    key: "enquiries",
    href: "/admin/enquiries",
    label: "Enquiries",
    description: "Every contact-form submission, ready to move into the CRM.",
    icon: "inbox",
    stats: (s) => [
      { value: s.enquiries_new, label: "new" },
      { value: s.enquiries_7d, label: "this week" },
    ],
  },
  {
    key: "crm",
    href: "/admin/crm",
    label: "CRM pipeline",
    description: "Leads on a kanban board, from first contact to reservation.",
    icon: "kanban",
    stats: (s) => [
      { value: s.leads_open, label: "open leads" },
      { value: s.leads_won, label: "won" },
    ],
  },
  {
    key: "calendar",
    href: "/admin/calendar",
    label: "Viewings",
    description: "Site visits on a calendar — requested and confirmed.",
    icon: "calendar",
    stats: (s) => [
      { value: s.viewings_upcoming, label: "upcoming" },
      { value: s.viewings_requested, label: "to confirm" },
    ],
  },
  {
    key: "chats",
    href: "/admin/chats",
    label: "AI chats",
    description: "Conversations with the website's AI assistant, and the leads it captured.",
    icon: "chat",
    stats: (s) => [
      { value: s.chats_7d ?? 0, label: "this week" },
      { value: s.chats_with_enquiry ?? 0, label: "leads (30 days)" },
    ],
  },
];
