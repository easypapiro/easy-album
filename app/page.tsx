import Link from "next/link";
import { ArrowRight, Download, ImageIcon, Phone, Play, Plus, Squares } from "@/components/ui/icons";
import { Branch, RingDivider, Rings } from "@/components/ui/ornaments";
import { buttonClass } from "@/components/ui/button-class";

const STEPS = [
  {
    n: "1",
    title: "Create l'evento",
    text: "Registratevi, inserite i vostri nomi e la data del matrimonio. L'album è pronto in pochi minuti.",
  },
  {
    n: "2",
    title: "Stampate il QR",
    text: "Scaricate il QR in PDF e mettetelo sui tavoli, sugli inviti o all'ingresso.",
  },
  {
    n: "3",
    title: "Gli invitati condividono",
    text: "Ognuno inquadra il QR, scrive il proprio nome e carica foto e video dal telefono.",
  },
];

const FEATURES = [
  {
    icon: Phone,
    title: "Semplice per gli invitati",
    text: "Nessuna app e nessuna registrazione: basta inquadrare il QR e scrivere il proprio nome.",
  },
  {
    icon: Squares,
    title: "Un feed condiviso",
    text: "Tutti vedono i ricordi caricati dagli altri, come in un social privato del vostro matrimonio.",
  },
  {
    icon: ImageIcon,
    title: "Foto e video",
    text: "Ogni invitato può caricare fino a 20 ricordi, dalla galleria o scattando sul momento.",
  },
  {
    icon: Download,
    title: "Tutto in un posto",
    text: "Niente più foto sparse tra chat e messaggi: ritrovate e scaricate i ricordi quando volete.",
  },
];

const FAQ = [
  {
    q: "Gli invitati devono scaricare un'app?",
    a: "No. Si apre tutto dal browser del telefono inquadrando il QR.",
  },
  {
    q: "Gli invitati devono registrarsi?",
    a: "No, basta inserire il proprio nome. Solo gli sposi creano un account per gestire l'evento.",
  },
  {
    q: "Quante foto e video può caricare ogni invitato?",
    a: "Fino a 20 ricordi a testa, tra foto e video.",
  },
  {
    q: "Come si crea il video ricordo?",
    a: "Dall'area sposi selezionate i media, scegliete la musica e generate il video.",
  },
];

const STRIP = ["#EAD9D0", "#DDE1D3", "#E4DCCF", "#EFE3D6", "#D9DED6", "#EAD9D0"];

const h2 = "m-0 font-serif text-[clamp(34px,5vw,46px)] leading-[1.1] font-medium";

export default function Landing() {
  return (
    <div className="w-full overflow-hidden bg-cream">
      <nav className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 text-ink no-underline">
          <Rings />
          <span className="font-serif text-2xl font-semibold">EasyAlbum</span>
        </Link>
        <Link
          href="/eventi"
          className="flex h-11 items-center rounded-full border border-line-strong px-[18px] text-[15px] font-medium text-ink"
        >
          Accedi
        </Link>
      </nav>

      <header id="top" className="relative mx-auto flex max-w-[1120px] flex-wrap items-center gap-12 px-5 pt-8 pb-16">
        <Branch className="pointer-events-none absolute -top-5 -right-8" />
        <div className="relative flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <span className="text-xs tracking-[0.22em] text-muted uppercase">Per gli sposi</span>
          <h1 className="m-0 font-serif text-[clamp(42px,7vw,68px)] leading-[1.02] font-medium">
            Il vostro matrimonio, visto con <span className="text-olive italic">gli occhi di tutti</span>
          </h1>
          <p className="m-0 max-w-[520px] text-[17px] leading-relaxed text-ink-2">
            Create un album condiviso in pochi minuti. Gli invitati inquadrano il QR sui tavoli e caricano foto e
            video dal telefono: voi ritrovate ogni ricordo in un unico posto e lo trasformate in un video con la
            musica.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/registrati" className={buttonClass({ size: "xl", className: "px-[26px]" })}>
              Crea il vostro album
              <ArrowRight size={18} />
            </Link>
            <a href="#come" className={buttonClass({ variant: "outline", size: "xl", className: "bg-transparent" })}>
              Come funziona
            </a>
          </div>
          <span className="text-[13px] text-muted">Gli invitati non devono scaricare app né registrarsi.</span>
        </div>

        <div className="relative flex flex-[1_1_300px] justify-center pt-2.5 pb-5">
          <div className="flex h-[480px] w-[250px] flex-col overflow-hidden rounded-[40px] border-8 border-ink bg-cream">
            <div className="flex flex-col gap-0.5 border-b border-line px-3.5 pt-[18px] pb-2.5">
              <span className="font-serif text-xl font-semibold">Giulia &amp; Marco</span>
              <span className="text-[10px] text-muted">Album condiviso · 248 ricordi</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="size-6 rounded-full bg-blush" />
              <span className="text-[11px] font-medium">Chiara Romano</span>
            </div>
            <div className="flex h-[210px] items-center justify-center bg-sand text-placeholder">
              <ImageIcon size={40} strokeWidth={1} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="size-6 rounded-full bg-sage-soft" />
              <span className="text-[11px] font-medium">Luca Bianchi</span>
            </div>
            <div className="flex-1 bg-sage-soft" />
          </div>
          <div className="absolute bottom-0 left-[calc(50%-175px)] flex items-center gap-2.5 rounded-[18px] border border-line bg-white p-3">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#2B2622" strokeWidth="1.6" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1" />
              <rect x="14" y="2" width="8" height="8" rx="1" />
              <rect x="2" y="14" width="8" height="8" rx="1" />
              <path d="M14 14h3v3h-3zM20 14v2M14 20h2M18 18h4v4h-4z" />
              <rect x="5" y="5" width="2" height="2" fill="#2B2622" />
              <rect x="17" y="5" width="2" height="2" fill="#2B2622" />
              <rect x="5" y="17" width="2" height="2" fill="#2B2622" />
            </svg>
            <span className="flex flex-col text-xs leading-snug">
              <strong className="font-semibold">Inquadra il QR</strong>
              <span className="text-muted">e carica i tuoi ricordi</span>
            </span>
          </div>
        </div>
      </header>

      <section id="come" className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-9 px-5 py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <RingDivider />
            <h2 className={h2}>Pronto in tre passi</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-2.5 rounded-[22px] border border-line bg-cream p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-olive font-serif text-2xl font-semibold text-white">
                  {s.n}
                </span>
                <h3 className="m-0 font-serif text-[26px] font-semibold">{s.title}</h3>
                <p className="m-0 text-[15px] leading-normal text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1120px] flex-col gap-9 px-5 py-16">
        <h2 className={`${h2} text-center`}>Pensato per il vostro giorno</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-7">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-2">
              <Icon size={32} className="text-olive" />
              <h3 className="m-0 text-[17px] font-semibold">{title}</h3>
              <p className="m-0 text-[15px] leading-normal text-ink-2">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-cream">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-10 px-5 py-16">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
            <span className="text-xs tracking-[0.22em] text-gold-soft uppercase">Video ricordo</span>
            <h2 className={h2}>
              Le vostre immagini, <span className="italic">a tempo di musica</span>
            </h2>
            <p className="m-0 text-base leading-relaxed text-line-strong">
              Scegliete le foto e i video più belli, aggiungete un brano e ottenete un video da rivedere e condividere
              con chi c&apos;era.
            </p>
          </div>
          <div className="flex flex-[1_1_300px] flex-col gap-2.5">
            <div className="relative flex h-[190px] items-center justify-center rounded-[18px] bg-sand">
              <span className="flex size-[60px] items-center justify-center rounded-full bg-cream text-ink">
                <Play size={22} />
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {STRIP.map((c, i) => (
                <span key={i} className="h-9 rounded-md" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 py-16">
        <h2 className={`${h2} text-center`}>Domande frequenti</h2>
        <div>
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-line py-4">
              <summary className="flex min-h-11 items-center justify-between gap-3 text-[17px] font-medium">
                {f.q}
                <Plus size={18} className="shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-2 mb-0 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto flex max-w-[1080px] flex-col items-center gap-[18px] rounded-[28px] bg-sage-soft px-6 py-12 text-center">
          <RingDivider />
          <h2 className="m-0 max-w-[640px] font-serif text-[clamp(32px,5vw,44px)] leading-[1.1] font-medium">
            Ogni sguardo sul vostro giorno, <span className="italic">in un solo album</span>
          </h2>
          <Link href="/registrati" className={buttonClass({ size: "xl", className: "px-7" })}>
            Crea il vostro album
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-3 px-5 pt-6 pb-8 text-[13px] text-muted">
          <span>EasyAlbum</span>
          <span className="flex gap-4">
            <a className="text-olive" href="#top">Privacy</a>
            <a className="text-olive" href="#top">Termini</a>
            <a className="text-olive" href="#top">Contatti</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
