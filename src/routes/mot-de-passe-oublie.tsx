import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Rollsy" },
      {
        name: "description",
        content: "Recevez un lien par email pour choisir un nouveau mot de passe Rollsy.",
      },
      { property: "og:title", content: "Mot de passe oublié — Rollsy" },
      { property: "og:description", content: "Réinitialisez le mot de passe de votre espace commerçant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Renseignez votre adresse email.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    setBusy(false);
    if (resetError) {
      setError("Impossible d'envoyer le lien pour le moment. Réessayez dans quelques minutes.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <h1 className="mb-2 font-display text-3xl font-extrabold">Mot de passe oublié 🔑</h1>
      <p className="mb-8 font-bold text-ink/70">
        Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>

      {sent ? (
        <div className="ink-border-thick rounded-3xl bg-white p-6 font-bold shadow-pop-pink">
          Si un compte existe avec cette adresse, un email vient de partir. Ouvrez le lien depuis ce même
          navigateur pour définir votre nouveau mot de passe.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="ink-border mb-4 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          {error && <p className="mb-3 text-sm font-extrabold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
          >
            {busy ? "Envoi..." : "Recevoir le lien"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm font-bold text-ink/60">
        <Link to="/admin" className="underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
