"use client";

import { useEffect, useState } from "react";

export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) =>
      QRCode.toString(value, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#2B2622", light: "#FFFFFF" },
      }).then((s) => !cancelled && setSvg(s)),
    );
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className="[&>svg]:size-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? undefined : <div className="size-full animate-pulse rounded-md bg-line-soft" />}
    </div>
  );
}
