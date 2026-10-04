"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonVariant } from "./ui";
import { Icon, type IconName } from "./icons";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  pendingLabel,
  className = "",
  confirm: confirmMessage,
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  pendingLabel?: string;
  className?: string;
  /** Ask before submitting (for destructive actions). */
  confirm?: string;
} & Omit<React.ComponentProps<"button">, "type" | "children">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      {...rest}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Modal built on the native <dialog>: focus trapping, Escape and the backdrop come free. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-3xl" : "max-w-xl"} rounded-[28px] border border-forest/10 bg-paper p-0 text-ink shadow-2xl backdrop:bg-forest/50 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl leading-tight font-light tracking-[-0.01em] text-forest uppercase">{title}</h2>
            <button type="button" onClick={onClose} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function NavLink({ href, icon, label, exact }: { href: Route; icon: IconName; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-[0.9rem] text-sage-2 transition-colors hover:bg-paper/10 hover:text-paper aria-[current=page]:bg-lime aria-[current=page]:font-semibold aria-[current=page]:text-forest"
    >
      <Icon name={icon} className="size-[18px]" />
      {label}
    </Link>
  );
}

/** Marks this browser as staff so the site's page-view counter ignores it. */
export function StaffFlag() {
  useEffect(() => {
    try {
      localStorage.setItem("rvl-staff", "1");
    } catch {}
  }, []);
  return null;
}
