"use client";

import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { isRegistered, useAuth } from "@/components/auth-provider";
import { Button, ErrorText, Field, useResetOnHide } from "@/components/ui/kit";
import { errorMessage } from "@/lib/errors";
import { auth } from "@/lib/firebase";

export default function Accedi() {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  useResetOnHide(() => {
    setBusy(false);
    setError("");
    setInfo("");
  });
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRegistered(user)) router.replace("/eventi");
  }, [user, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth(), String(f.get("email")).trim(), String(f.get("password")));
      router.replace("/eventi");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function reset() {
    const email = emailRef.current?.value.trim();
    setInfo("");
    if (!email) {
      setError("Scrivi la tua email qui sopra, poi tocca di nuovo «Password dimenticata».");
      emailRef.current?.focus();
      return;
    }
    try {
      await sendPasswordResetEmail(auth(), email);
      setError("");
      setInfo(`Ti abbiamo inviato un'email a ${email} per reimpostare la password.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <AuthScreen
      title="Accedi"
      italic="ai tuoi eventi"
      intro="Gestisci i tuoi eventi, scarica i QR da stampare e crea i video ricordo."
    >
      <form onSubmit={submit} className="flex flex-1 flex-col gap-3">
        <Field ref={emailRef} label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <button type="button" onClick={reset} className="min-h-11 self-start text-sm font-medium text-olive">
          Password dimenticata?
        </button>
        <ErrorText>{error}</ErrorText>
        {info && <p className="rounded-xl bg-sage-soft px-3.5 py-2.5 text-sm text-olive-dark">{info}</p>}
        <div className="mt-auto flex flex-col gap-4 pt-4">
          <Button type="submit" block loading={busy}>
            Accedi
          </Button>
          <p className="m-0 text-center text-sm text-ink-2">
            Non hai ancora un account?{" "}
            <Link href="/registrati" className="font-medium text-olive">
              Registrati
            </Link>
          </p>
        </div>
      </form>
    </AuthScreen>
  );
}
