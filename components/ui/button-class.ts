export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "outline" | "dark" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-olive text-white hover:bg-olive-dark disabled:bg-olive/50",
  outline: "border border-olive bg-white text-olive-dark hover:bg-sage-soft/40 disabled:opacity-50",
  dark: "bg-ink text-cream hover:bg-black disabled:opacity-50",
  ghost: "border border-line-strong text-ink hover:bg-white disabled:opacity-50",
};

const SIZES = {
  md: "h-12 px-5 text-[15px]",
  lg: "h-[52px] px-6 text-base",
  xl: "h-[54px] px-6 text-base",
};

export type BtnBase = {
  variant?: Variant;
  size?: keyof typeof SIZES;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function buttonClass({ variant = "primary", size = "lg", block, className }: Omit<BtnBase, "children">) {
  return cx(
    "inline-flex items-center justify-center gap-2.5 rounded-full font-medium transition-colors select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}
