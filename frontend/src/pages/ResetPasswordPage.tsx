import { useState } from "react";
import type { FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation)
      return setError(t("resetPassword.mismatch"));
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/auth/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      setSuccess(true);
    } catch {
      setError(t("resetPassword.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success)
    return (
      <section className="mx-auto max-w-xl px-5 py-24 text-center sm:px-8">
        <CircleCheck className="mx-auto size-12 text-emerald-600" />
        <h1 className="mt-6 font-heading text-3xl font-bold text-ink">
          {t("resetPassword.successTitle")}
        </h1>
        <p className="mt-4 text-ink-secondary">
          {t("resetPassword.successText")}
        </p>
        <Button
          asChild
          className="mt-8 rounded-full bg-gold text-ink hover:bg-gold-light"
        >
          <Link to="/connexion">{t("resetPassword.login")}</Link>
        </Button>
      </section>
    );

  return (
    <section className="mx-auto max-w-xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
        {t("resetPassword.eyebrow")}
      </p>
      <h1 className="mt-4 font-heading text-4xl font-bold text-ink">
        {t("resetPassword.title")}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
        {t("resetPassword.intro")}
      </p>
      <form
        onSubmit={submit}
        className="mt-9 space-y-6 rounded-[28px] border border-black/5 bg-surface p-8 shadow-[0_18px_60px_-16px_rgba(0,0,0,0.12)] sm:p-12"
      >
        <div className="space-y-2">
          <Label htmlFor="new-password">{t("resetPassword.newPassword")}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-14 rounded-xl px-5 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t("resetPassword.confirmPassword")}</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="h-14 rounded-xl px-5 text-base"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="h-14 w-full rounded-full bg-gold text-base text-ink hover:bg-gold-light"
        >
          {submitting ? t("resetPassword.updating") : t("resetPassword.submit")}
        </Button>
      </form>
    </section>
  );
}
