import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function LoginPage() {
  const { login, verifyAdminMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mfaChallenge) {
        await verifyAdminMfa(mfaChallenge, code);
      } else {
        const result = await login(email, password);
        if (result.mfaRequired && result.challengeId) {
          setMfaChallenge(result.challengeId);
          setMfaMessage(
            result.message ??
              "Un code de sécurité vous a été envoyé par e-mail.",
          );
          setSubmitting(false);
          return;
        }
      }
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/";
      navigate(destination, { replace: true });
    } catch (err) {
      if (mfaChallenge && err instanceof ApiError && err.status === 400) {
        setError("Le code est incorrect ou a expiré.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("E-mail ou mot de passe incorrect.");
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
      setSubmitting(false);
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.14),transparent)]"
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-5 pt-16 pb-24 sm:px-8 sm:pt-24 sm:pb-32">
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex flex-col items-center text-center duration-700 motion-reduce:animate-none">
          <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
            {mfaChallenge ? "Sécurité administrateur" : "Espace membre"}
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
            {mfaChallenge
              ? "Confirmez votre connexion"
              : "Content de vous revoir"}
          </h1>
          <div
            aria-hidden="true"
            className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-gold to-gold-dark"
          />
        </div>

        <form
          data-testid="login-form"
          onSubmit={handleSubmit}
          noValidate
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-10 w-full rounded-[28px] border border-black/5 bg-surface p-8 shadow-[0_18px_60px_-16px_rgba(0,0,0,0.12)] delay-150 duration-700 motion-reduce:animate-none sm:p-14"
        >
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {mfaChallenge ? (
            <div className="space-y-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
                <ShieldCheck aria-hidden="true" className="size-6" />
              </div>
              <p className="text-sm leading-6 text-ink-secondary">
                {mfaMessage}
              </p>
              <div className="space-y-2">
                <Label htmlFor="admin-code" className="text-ink">
                  Code à six chiffres
                </Label>
                <Input
                  id="admin-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  className="h-14 rounded-xl px-4 text-center text-2xl tracking-[0.35em]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ink">
                  Adresse e-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="vous@exemple.sn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-xl px-5 text-base"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password" className="text-ink">
                    Mot de passe
                  </Label>
                  <Link
                    to="/mot-de-passe/oublie"
                    className="text-xs font-semibold text-gold-dark hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-xl px-5 text-base"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="mt-9 h-14 w-full rounded-full bg-gold text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
          >
            {submitting
              ? "Vérification…"
              : mfaChallenge
                ? "Vérifier et se connecter"
                : "Se connecter"}
          </Button>

          {mfaChallenge && (
            <button
              type="button"
              onClick={() => {
                setMfaChallenge(null);
                setMfaMessage(null);
                setCode("");
                setError(null);
              }}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-ink-secondary transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Revenir à la connexion
            </button>
          )}
        </form>

        {!mfaChallenge && (
          <p className="animate-in fade-in fill-mode-backwards mt-8 text-sm text-ink-secondary delay-300 duration-700 motion-reduce:animate-none">
            Pas encore de compte ?{" "}
            <Link
              to="/inscription"
              className="rounded-sm font-semibold text-gold-dark underline-offset-4 transition-colors outline-none hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              S'inscrire
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

export default LoginPage;
