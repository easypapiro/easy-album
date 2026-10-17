import type { AlbumEvent } from "./types";
import { eventTitle, longDate, prettyUrl } from "./format";

/**
 * A4 sheet with four A6 table cards (cut along the dashed lines).
 * jsPDF and qrcode are loaded on demand to keep them out of the main bundle.
 */
export async function downloadQrPdf(event: AlbumEvent, url: string) {
  const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
  const qr = await QRCode.toDataURL(url, {
    margin: 0,
    width: 1024,
    errorCorrectionLevel: "M",
    color: { dark: "#2B2622", light: "#FFFFFF" },
  });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 105;
  const H = 148.5;
  const ink: [number, number, number] = [43, 38, 34];
  const gold: [number, number, number] = [160, 126, 74];
  const muted: [number, number, number] = [107, 98, 90];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = col * W;
      const y = row * H;
      const cx = x + W / 2;

      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setCharSpace(0.8);
      doc.text("BENVENUTI AL MATRIMONIO DI", cx, y + 20, { align: "center" });
      doc.setCharSpace(0);

      doc.setTextColor(...ink);
      doc.setFont("times", "normal");
      doc.setFontSize(26);
      doc.text(eventTitle(event), cx, y + 32, { align: "center", maxWidth: W - 16 });

      if (event.date) {
        doc.setFont("times", "italic");
        doc.setFontSize(12);
        doc.setTextColor(...gold);
        doc.text(longDate(event.date), cx, y + 40, { align: "center" });
      }

      const size = 58;
      doc.addImage(qr, "PNG", cx - size / 2, y + 48, size, size);

      doc.setTextColor(...ink);
      doc.setFont("times", "italic");
      doc.setFontSize(14);
      doc.text("Inquadra e condividi i tuoi ricordi", cx, y + 118, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text("Nessuna app e nessuna registrazione", cx, y + 125, { align: "center" });
      doc.text(prettyUrl(url), cx, y + 131, { align: "center" });
    }
  }

  // Cut lines
  doc.setDrawColor(201, 187, 168);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(W, 0, W, 2 * H);
  doc.line(0, H, 2 * W, H);

  doc.save(`QR-${event.slug}.pdf`);
}
