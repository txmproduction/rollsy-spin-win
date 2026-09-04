import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Rollsy" },
      {
        name: "description",
        content: "Choisissez un nouveau mot de passe pour votre espace commerçant Rollsy.",
      },
      { property: "og:title", content: "Nouveau mot de passe — Rollsy" },
      { property: "og:description", content: "Définissez un nouveau mot de passe en toute sécurité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(!!data.session);
      setChecking(false);
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setHasSession(!!session);
      setChecking(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Impossible d'enregistrer le mot de passe. Redemandez un lien.");
      return;
    }
    navigate({ to: "/admin" });
  }

  if (checking) return null;

  if (!hasSession) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold">Lien invalide ou expiré ⏳</h1>
        <p className="font-bold text-ink/70">
          Ouvrez le lien reçu par email depuis ce même navigateur, ou redemandez un nouveau lien.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 font-display text-3xl font-extrabold">Nouveau mot de passe 🔐</h1>
      <p className="mb-8 font-bold text-ink/70">Au moins 8 caractères, une lettre et un chiffre.</p>

      <form onSubmit={handleSubmit} className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink">
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-extrabold">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ink-border min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-extrabold">Confirmation</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="ink-border min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
        </label>
        {error && <p className="mb-3 text-sm font-extrabold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="ink-border-thick min-h-[56px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
        >
          {busy ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </main>
  );
}
