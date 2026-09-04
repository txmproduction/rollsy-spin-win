import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Essai gratuit 14 jours — Rollsy" },
      {
        name: "description",
        content:
          "Créez votre compte Rollsy en 1 minute et lancez votre roue à avis : essai gratuit de 14 jours, sans carte bancaire.",
      },
      { property: "og:title", content: "Essai gratuit 14 jours — Rollsy" },
      {
        property: "og:description",
        content: "Créez votre compte Rollsy et lancez votre roue à avis en quelques minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36)).join("") + "Aa1!";
}

function SignupPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    companyName: "",
  });
  const [cgv, setCgv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.companyName.trim()) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setError("Adresse email invalide.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 8) {
      setError("Numéro de téléphone invalide.");
      return;
    }
    if (!cgv) {
      setError("Vous devez accepter les conditions générales de vente.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: randomPassword(),
      options: {
        emailRedirectTo: `${window.location.origin}/confirmation`,
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: form.phone.trim(),
          company_name: form.companyName.trim(),
          cgv_accepted_at: new Date().toISOString(),
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("registered")
          ? "Un compte existe déjà avec cet email."
          : "Inscription impossible pour le moment, réessayez.",
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold">Vérifiez vos emails 📬</h1>
        <p className="font-bold text-ink/70">
          Nous avons envoyé un lien de confirmation à <strong>{form.email}</strong>. Cliquez dessus
          pour choisir votre mot de passe et activer votre compte. Le lien expire sous 24 heures.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1
        className="mb-2 font-display text-3xl font-extrabold"
        style={{
          color: "#FF3DA6",
          WebkitTextStroke: "2px #1a1a1a",
          paintOrder: "stroke fill",
          filter: "drop-shadow(4px 4px 0 #1a1a1a)",
        }}
      >
        Essai gratuit 14 jours 🎉
      </h1>
      <p className="mb-8 font-bold text-ink/70">Sans carte bancaire, sans engagement.</p>

      <form onSubmit={handleSubmit} className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink">
        {(
          [
            ["firstName", "Prénom", "text"],
            ["lastName", "Nom", "text"],
            ["phone", "Téléphone", "tel"],
            ["email", "Email professionnel", "email"],
            ["companyName", "Nom du commerce", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="mb-3 block">
            <span className="mb-1 block text-sm font-extrabold">{label} *</span>
            <input
              type={type}
              value={form[key]}
              onChange={set(key)}
              className="ink-border min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
            />
          </label>
        ))}

        <label className="mb-4 mt-2 flex cursor-pointer items-start gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={cgv}
            onChange={(e) => setCgv(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#FF3DA6]"
          />
          <span>
            J'accepte les{" "}
            <Link to="/cgv" className="underline">
              conditions générales de vente
            </Link>{" "}
            et la{" "}
            <Link to="/confidentialite" className="underline">
              politique de confidentialité
            </Link>
            . *
          </span>
        </label>

        {error && <p className="mb-3 text-sm font-extrabold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="ink-border-thick min-h-[56px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
        >
          {loading ? "Création..." : "Démarrer mon essai gratuit de 14 jours 🚀"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-bold text-ink/60">
        Déjà un compte ?{" "}
        <Link to="/admin" className="underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
