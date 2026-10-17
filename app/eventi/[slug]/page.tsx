"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useOwnedEvent } from "@/components/account-context";
import { QrCode } from "@/components/qr-code";
import { ChevronLeft, ChevronRight, Download, Film, LinkIcon, Squares } from "@/components/ui/icons";
import { Button, Screen, useToast } from "@/components/ui/kit";
import { RingDivider } from "@/components/ui/ornaments";
import { getEventStats } from "@/lib/events";
import { albumUrl, eventTitle, prettyUrl } from "@/lib/format";
import { downloadQrPdf } from "@/lib/qr-pdf";

type Stats = Awaited<ReturnType<typeof getEventStats>>;

const noopSubscribe = () => () => {};

export default function EventDashboard() {
  const { event } = useOwnedEvent();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [toast, showToast] = useToast();
  // window.location is only known on the client; the server snapshot is empty.
  const url = useSyncExternalStore(
    noopSubscribe,
    () => albumUrl(event.slug),
    () => "",
  );

  useEffect(() => {
    getEventStats(event.slug).then(setStats).catch(() => {});
  }, [event.slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copiato");
    } catch {
      showToast(url);
    }
  }

  async function pdf() {
    setPdfBusy(true);
    try {
      await downloadQrPdf(event, url);
    } catch {
      showToast("Non è stato possibile creare il PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  const tiles = [
    { label: "Foto", value: stats?.photos },
    { label: "Video", value: stats?.videos },
  ];

  return (
    <Screen className="safe-bottom gap-4 px-4 pt-[18px]">
      <header className="flex items-center gap-1.5">
        <Link
          href="/eventi"
          aria-label="Torna ai tuoi eventi"
          className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
        >
          <ChevronLeft size={22} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs tracking-[0.2em] text-muted uppercase">Area sposi</span>
          <h1 className="truncate font-serif text-[30px] leading-[1.05] font-semibold">{eventTitle(event)}</h1>
        </div>
        <span className="shrink-0 rounded-full bg-sage-soft px-3 py-1.5 text-xs font-semibold text-olive-dark">
          Admin
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-white p-3">
            <span className="font-serif text-[28px] leading-none font-semibold">
              {t.value ?? <span className="inline-block h-7 w-8 animate-pulse rounded bg-line-soft align-middle" />}
            </span>
            <span className="text-xs text-muted">{t.label}</span>
          </div>
        ))}
      </div>

      <Link
        href={`/${event.slug}/feed`}
        className="flex items-center gap-3.5 rounded-[22px] border border-line bg-white p-[18px] text-ink no-underline transition-colors hover:border-line-strong"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-soft text-olive-dark">
          <Squares size={22} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="font-serif text-[22px] font-semibold">Apri l&apos;album</span>
          <span className="text-[13px] leading-snug text-muted">
            Guardate il feed, mettete like e caricate anche voi foto e video.
          </span>
        </span>
        <ChevronRight size={20} className="text-muted" />
      </Link>

      <section className="flex flex-col items-center gap-3.5 rounded-[22px] border border-line bg-white px-[18px] pt-[22px] pb-[18px]">
        <RingDivider width={150} />
        <div className="rounded-[14px] border border-line bg-white p-3">
          {url ? (
            <QrCode value={url} size={200} label="Codice QR per entrare nell'album" />
          ) : (
            <div className="size-[200px]" />
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-serif text-[22px] italic">Inquadra e condividi i tuoi ricordi</span>
          <span className="text-[13px] break-all text-muted">{prettyUrl(url)}</span>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button size="md" className="text-sm" onClick={pdf} loading={pdfBusy} disabled={!url}>
            <Download size={18} />
            QR da stampare per i tavoli (PDF)
          </Button>
          <Button size="md" variant="outline" className="text-sm" onClick={copyLink} disabled={!url}>
            <LinkIcon size={18} />
            Copia link
          </Button>
        </div>
      </section>

      <Link
        href={`/eventi/${event.slug}/seleziona`}
        className="flex items-center gap-3.5 rounded-[22px] bg-ink p-[18px] text-cream no-underline"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-soft text-ink">
          <Film size={24} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="font-serif text-[22px] font-semibold">Crea il video ricordo</span>
          <span className="text-[13px] leading-snug text-line-strong">
            Scegliete foto e video, aggiungete la musica: le immagini scorrono a tempo.
          </span>
        </span>
        <ChevronRight size={20} />
      </Link>

      {toast}
    </Screen>
  );
}
