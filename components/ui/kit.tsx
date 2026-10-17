"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft } from "./icons";

import { buttonClass, cx, type BtnBase } from "./button-class";

export function Button({
  variant,
  size,
  block,
  className,
  loading,
  children,
  ...rest
}: BtnBase & React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className={buttonClass({ variant, size, block, className })}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  href,
}: BtnBase & { href: string }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, block, className })}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Caricamento"
      className={cx(
        "inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  className,
  ...rest
}: { label: React.ReactNode; hint?: string } & React.ComponentProps<"input">) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
        {hint && <span className="font-normal text-muted"> {hint}</span>}
      </label>
      <input id={id} className="field" {...rest} />
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-heart/10 px-3.5 py-2.5 text-sm text-heart">
      {children}
    </p>
  );
}

/** Mobile column: full width on phones, centered card-width on larger screens. */
export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-cream", className)}>
      {children}
    </div>
  );
}

export function BackHeader({
  href,
  label,
  title,
  subtitle,
  right,
}: {
  href: string;
  label: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-1.5">
      <Link
        href={href}
        aria-label={label}
        className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-white"
      >
        <ChevronLeft size={22} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate font-serif text-[28px] leading-[1.05] font-semibold">{title}</h1>
        {subtitle && <span className="text-[13px] text-muted">{subtitle}</span>}
      </div>
      {right}
    </header>
  );
}

export function Chip({
  active,
  children,
  ...rest
}: { active: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "h-9 shrink-0 rounded-full px-4 text-sm transition-colors",
        active ? "bg-ink text-cream" : "border border-line-strong bg-white text-ink",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-medium tracking-[0.12em] text-muted uppercase">{children}</h2>
  );
}

export function FullScreenLoader({ label = "Caricamento…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="text-olive" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Bottom sheet for contextual actions. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Chiudi"
        className="absolute inset-0 bg-ink/40 animate-[fade-in_.15s_ease-out]"
        onClick={onClose}
      />
      <div className="safe-bottom relative w-full max-w-[480px] rounded-t-3xl bg-cream px-4 pt-3 animate-[slide-up_.2s_ease-out]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        {title && <h2 className="mb-3 px-1 font-serif text-2xl font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function SheetAction({
  icon,
  children,
  danger,
  ...rest
}: { icon: React.ReactNode; danger?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-medium hover:bg-white",
        danger ? "text-heart" : "text-ink",
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Next keeps visited pages mounted but hidden (React Activity), so their state
 * survives navigation. Runs `reset` when the page is hidden, so coming back
 * doesn't show a stuck spinner or a menu left open.
 */
export function useResetOnHide(reset: () => void) {
  const ref = useRef(reset);
  useLayoutEffect(() => {
    ref.current = reset;
  });
  useLayoutEffect(() => () => ref.current(), []);
}

/** Lightweight toast: `const [toast, show] = useToast()` then render `{toast}`. */
export function useToast(): [React.ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = msg ? (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4 animate-[fade-in_.15s_ease-out]"
    >
      <span className="rounded-full bg-ink px-4 py-2.5 text-sm text-cream shadow-lg">{msg}</span>
    </div>
  ) : null;
  return [node, show];
}

export { buttonClass, cx };
