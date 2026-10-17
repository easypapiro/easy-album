type P = React.SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 20, strokeWidth = 1.8, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: P) => (
  <Stroke {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Stroke>
);
export const ChevronLeft = (p: P) => (
  <Stroke {...p}><path d="M15 5l-7 7 7 7" /></Stroke>
);
export const ChevronRight = (p: P) => (
  <Stroke {...p}><path d="M9 5l7 7-7 7" /></Stroke>
);
export const Plus = (p: P) => (
  <Stroke strokeWidth={2} {...p}><path d="M12 5v14M5 12h14" /></Stroke>
);
export const Close = (p: P) => (
  <Stroke strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></Stroke>
);
export const Check = (p: P) => (
  <Stroke strokeWidth={2.4} {...p}><path d="M5 12l5 5 9-10" /></Stroke>
);
export const Download = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14" /></Stroke>
);
export const LinkIcon = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Stroke>
);
export const ImageIcon = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></Stroke>
);
export const Camera = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Stroke>
);
export const Grid = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Stroke>
);
export const List = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><rect x="4" y="3" width="16" height="11" rx="1.5" /><path d="M4 18h16M4 21h10" /></Stroke>
);
export const QrIcon = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </Stroke>
);
export const Music = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></Stroke>
);
export const Film = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 5v4M12 5v4M17 5v4" />
    <path d="M10.5 12.5v4l3.5-2z" fill="currentColor" />
  </Stroke>
);
export const Sparkle = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}>
    <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" />
    <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Stroke>
);
export const Trash = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Stroke>
);
export const LogOut = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></Stroke>
);
export const Eye = (p: P) => (
  <Stroke strokeWidth={1.6} {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Stroke>
);
export const Phone = (p: P) => (
  <Stroke strokeWidth={1.4} {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></Stroke>
);
export const Squares = (p: P) => (
  <Stroke strokeWidth={1.4} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18M12 3v18" /></Stroke>
);

export const Play = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const Pause = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
export const Dots = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
  </svg>
);
export const Heart = ({ size = 24, filled, ...p }: P & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.6 1.2 4.6 2.7C12 6.2 13.6 5 15.6 5 19 5 20.7 8.4 19.2 11.4 17 15.6 12 20 12 20z" />
  </svg>
);
