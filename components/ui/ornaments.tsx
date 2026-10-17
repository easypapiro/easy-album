/** Decorative botanical line art from the design. All aria-hidden. */

export function Branch({
  size = 170,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 170 170"
      fill="none"
      stroke="#7A8466"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M165 8 C120 30 80 70 40 160" />
      <path d="M140 22 c-14 -2 -24 6 -28 16 c14 2 24 -4 28 -16z" />
      <path d="M132 27 c2 -14 -6 -24 -16 -26 c-2 14 4 24 16 26z" />
      <path d="M106 50 c-14 -2 -24 6 -28 16 c14 2 24 -4 28 -16z" />
      <path d="M98 58 c2 -14 -6 -24 -16 -26 c-2 14 4 24 16 26z" />
      <path d="M80 86 c-14 -2 -24 6 -28 16 c14 2 24 -4 28 -16z" />
      <path d="M72 96 c2 -14 -6 -24 -16 -26 c-2 14 4 24 16 26z" />
      <circle cx="56" cy="128" r="3" fill="#A07E4A" stroke="none" />
      <circle cx="64" cy="118" r="2" fill="#A07E4A" stroke="none" />
    </svg>
  );
}

/** Two interlocking rings, the brand mark. */
export function Rings({ width = 30, className }: { width?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={width}
      height={(width * 18) / 30}
      viewBox="0 0 30 18"
      fill="none"
      stroke="#A07E4A"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <circle cx="11" cy="9" r="7" />
      <circle cx="19" cy="9" r="7" />
    </svg>
  );
}

/** Line — rings — line. */
export function RingDivider({ width = 160, className }: { width?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={width}
      height={(width * 24) / 160}
      viewBox="0 0 160 24"
      fill="none"
      stroke="#A07E4A"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M8 12 H62" />
      <path d="M98 12 H152" />
      <circle cx="74" cy="12" r="8" />
      <circle cx="86" cy="12" r="8" />
    </svg>
  );
}

/** Horizontal sprig used on upload areas. */
export function LeafLine({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="120"
      height="22"
      viewBox="0 0 120 22"
      fill="none"
      stroke="#7A8466"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 11 H114" />
      <path d="M40 11 c-6 -8 -14 -9 -18 -6 c4 6 12 7 18 6z" />
      <path d="M80 11 c6 -8 14 -9 18 -6 c-4 6 -12 7 -18 6z" />
      <path d="M52 11 c-4 6 -10 8 -14 6 c3 -5 9 -7 14 -6z" />
      <path d="M68 11 c4 6 10 8 14 6 c-3 -5 -9 -7 -14 -6z" />
      <circle cx="60" cy="11" r="2.5" fill="#A07E4A" stroke="none" />
    </svg>
  );
}
