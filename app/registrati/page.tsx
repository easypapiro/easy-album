"use client";

import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { isRegistered, useAuth } from "@/components/auth-provider";
import { Button, ErrorText, Field, useResetOnHide } from "@/components/ui/kit";
import { errorMessage } from "@/lib/errors";
import { auth } from "@/lib/firebase";

export default function Registrazione() {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnHide(() => {
    setBusy(false);
    setError("");
  });

  useEffect(() => {
    if (isRegistered(user) && !busy) router.replace("/eventi");
  }, [user, busy, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get("terms")) {
      setError("Per continuare accetta i termini di servizio.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(
        auth(),
        String(f.get("email")).trim(),
        String(f.get("password")),
      );
      await updateProfile(cred.user, { displayName: String(f.get("name")).trim() });
      router.replace("/eventi/nuovo");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Crea il tuo account"
      italic="per i tuoi eventi"
      intro="Con un account crei e gestisci gli album dei tuoi eventi. Gli invitati non dovranno registrarsi: basterà il loro nome."
    >
      <form onSubmit={submit} className="flex flex-1 flex-col gap-3">
        <Field label="Nome e cognome" name="name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={6} required />
        <label className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-2">
          <input type="checkbox" name="terms" className="m-0 size-5 shrink-0 accent-olive" />
          Accetto i termini di servizio e l&apos;informativa privacy
        </label>
        <ErrorText>{error}</ErrorText>
        <div className="mt-auto flex flex-col gap-4 pt-4">
          <Button type="submit" block loading={busy}>
            Crea account
          </Button>
          <p className="m-0 text-center text-sm text-ink-2">
            Hai già un account?{" "}
            <Link href="/accedi" className="font-medium text-olive">
              Accedi
            </Link>
          </p>
        </div>
      </form>
    </AuthScreen>
  );
}
