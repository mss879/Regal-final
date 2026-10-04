import Link from "next/link";
import { buttonClass } from "@/components/admin/ui";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow text-leaf">404</p>
      <h1 className="mt-3 font-display text-3xl font-light text-forest uppercase">Page not found</h1>
      <p className="mt-3 text-[0.9rem] text-ink-2">That admin page doesn&apos;t exist.</p>
      <Link href="/admin" className={buttonClass("primary", "md", "mt-6")}>Back to the dashboard</Link>
    </div>
  );
}
