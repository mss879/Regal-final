import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { signOut } from "@/lib/admin/actions/auth";
import { ADMIN_FEATURES } from "@/lib/admin/features";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/admin/icons";
import { NavLink, StaffFlag, SubmitButton } from "@/components/admin/client";
import { ViewingDialogProvider } from "@/components/admin/viewings/ViewingDialog";

// Admin pages always render per request (they read the session) and are never cached.
export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const { admin } = await requireAdmin();
  const nav = ADMIN_FEATURES.map((f) => <NavLink key={f.key} href={f.href} icon={f.icon} label={f.label} exact={f.href === "/admin"} />);

  return (
    <ViewingDialogProvider>
      <StaffFlag />
      <div className="flex min-h-dvh flex-col gap-3 p-3 md:p-4 lg:flex-row">
        <aside className="grain relative overflow-hidden rounded-[28px] bg-forest text-paper lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:rounded-[32px]">
          <div className="relative flex items-center justify-between gap-4 px-5 pt-5 lg:block lg:px-6 lg:pt-7">
            <Link href="/admin" aria-label="Dashboard">
              <Logo className="w-32 text-paper lg:w-36" />
            </Link>
            <p className="eyebrow text-lime lg:mt-4">Admin</p>
          </div>
          <nav aria-label="Admin" className="no-scrollbar relative flex gap-1 overflow-x-auto px-3 py-4 lg:mt-6 lg:flex-col lg:overflow-visible lg:px-4">
            {nav}
          </nav>
          <div className="relative mt-auto hidden border-t border-paper/10 px-6 py-5 lg:block">
            <p className="truncate text-[0.8rem] text-sage-2" title={admin.email}>{admin.full_name ?? admin.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <Link href="/" className="inline-flex items-center gap-1.5 text-[0.78rem] text-sage hover:text-lime">
                <Icon name="external" className="size-4" /> Website
              </Link>
              <form action={signOut} className="ml-auto">
                <SubmitButton variant="ghost" size="sm" className="!text-sage hover:!bg-paper/10 hover:!text-paper">
                  <Icon name="logout" className="size-4" /> Sign out
                </SubmitButton>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-[28px] bg-cream px-1 py-4 md:px-4 lg:py-6">
          {children}
          <div className="mt-10 flex items-center justify-between border-t border-forest/10 pt-5 text-[0.78rem] text-ink-2 lg:hidden">
            <span className="truncate">{admin.email}</span>
            <form action={signOut}>
              <SubmitButton variant="ghost" size="sm">Sign out</SubmitButton>
            </form>
          </div>
        </main>
      </div>
    </ViewingDialogProvider>
  );
}
