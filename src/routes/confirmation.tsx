import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeSignup } from "@/lib/rollsy.functions";

export const Route = createFileRoute("/confirmation")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Activez votre compte — Rollsy" },
      {
        name: "description",
        content: "Choisissez votre mot de passe pour activer votre compte Rollsy et lancer votre roue.",
      },
      { property: "og:title", content: "Activez votre compte — Rollsy" },
      { property: "og:description", content: "Choisissez votre mot de passe et activez votre compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError("Impossible d'enregistrer le mot de passe. Redemandez un lien de confirmation.");
      return;
    }
    const { data } = await supabase.auth.getUser();
    const meta = (data.user?.user_metadata ?? {}) as Record<string, string>;
    try {
      await completeSignup({
        data: {
          firstName: meta.first_name ?? "",
          lastName: meta.last_name ?? "",
          phone: meta.phone ?? "",
          companyName: meta.company_name ?? "",
          email: data.user?.email ?? "",
        },
      });
    } catch {
      /* le compte est créé au premier accès à l'admin si besoin */
    }
    setLoading(false);
    navigate({ to: "/onboarding" });
  }

  if (checking) return null;

  if (!hasSession) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold">Lien invalide ou expiré ⏳</h1>
        <p className="font-bold text-ink/70">
          Ouvrez le lien reçu par email depuis le même navigateur, ou refaites une inscription.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 font-display text-3xl font-extrabold">Choisissez votre mot de passe 🔐</h1>
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
          disabled={loading}
          className="ink-border-thick min-h-[56px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
        >
          {loading ? "Activation..." : "Activer mon compte ✅"}
        </button>
      </form>
    </main>
  );
}
