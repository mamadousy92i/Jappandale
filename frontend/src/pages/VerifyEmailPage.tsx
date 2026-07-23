import { useState } from "react";
import type { FormEvent } from "react";
import { BadgeCheck, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function VerifyEmailPage() {
  const { user, authFetch, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  if (user.email_verified) {
    return (
      <section className="mx-auto max-w-xl px-5 py-24 text-center sm:px-8">
        <BadgeCheck className="mx-auto size-12 text-emerald-600" />
        <h1 className="mt-5 font-heading text-3xl font-bold text-ink">
          Adresse déjà vérifiée
        </h1>
        <Button
          onClick={() => navigate("/compte")}
          className="mt-7 rounded-full bg-gold text-ink"
        >
          Continuer
        </Button>
      </section>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authFetch("/auth/email-verification/verify/", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      await refreshUser();
      navigate("/compte?onglet=kyc", { replace: true });
    } catch {
      setError("Code incorrect ou expiré. Vérifiez les six chiffres reçus.");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      await authFetch("/auth/email-verification/send/", { method: "POST" });
      setMessage("Un nouveau code vient d’être envoyé par e-mail.");
    } catch {
      setError("Le code n’a pas pu être renvoyé. Patientez quelques minutes.");
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center sm:px-8 sm:py-28">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
        <Mail className="size-7" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
        Vérification e-mail
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold text-ink">
        Saisissez le code reçu
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
        Un code à six chiffres a été envoyé uniquement à{" "}
        <strong className="text-ink">{user.email}</strong>. Il expire après dix
        minutes.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 rounded-[28px] border border-black/5 bg-surface p-8 text-left shadow-[0_18px_60px_-16px_rgba(0,0,0,0.12)] sm:p-12"
      >
        <div className="space-y-2">
          <Label htmlFor="email-code">Code de vérification</Label>
          <Input
            id="email-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="h-14 rounded-xl text-center font-mono text-2xl tracking-[0.45em]"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {message}
          </p>
        )}
        <Button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="mt-7 h-14 w-full rounded-full bg-gold text-base text-ink hover:bg-gold-light"
        >
          {submitting ? "Vérification…" : "Vérifier mon adresse"}
        </Button>
        <button
          type="button"
          disabled={resending}
          onClick={() => void resend()}
          className="mt-4 w-full text-center text-sm font-semibold text-gold-dark hover:underline disabled:opacity-50"
        >
          {resending ? "Envoi…" : "Renvoyer un code"}
        </button>
      </form>
    </section>
  );
}
