import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccessGate } from "@/components/AccessGate";
import { completeSignup, saveWheelSetup } from "@/lib/rollsy.functions";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurez votre roue — Rollsy" },
      { name: "description", content: "Trois étapes pour paramétrer votre roue Rollsy et vos récompenses." },
      { property: "og:title", content: "Configurez votre roue — Rollsy" },
      { property: "og:description", content: "Objectif, récompenses et fréquence : votre roue en 3 étapes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPageGated,
});

function OnboardingPageGated() {
  return (
    <AccessGate>
      <OnboardingPage />
    </AccessGate>
  );
}

const GOALS = [
  { value: "google", label: "Avis Google ⭐" },
  { value: "instagram", label: "Abonnement Instagram 📸" },
  { value: "tiktok", label: "Abonnement TikTok 🎵" },
  { value: "autre", label: "Autre lien 🔗" },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [goalType, setGoalType] = useState<string>("google");
  const [goalUrl, setGoalUrl] = useState("");
  const [count, setCount] = useState(4);
  const [rewards, setRewards] = useState(
    Array.from({ length: 4 }, (_, i) => ({ name: "", quota: i === 0 ? 3 : 1 })),
  );
  const [frequency, setFrequency] = useState<"day" | "week">("week");
  const [rewardMode, setRewardMode] = useState<"immediate" | "next_visit">("immediate");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleLogoFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("Le logo doit peser moins de 2 Mo.");
      return;
    }
    setUploading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) throw new Error("no session");
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${uid}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("merchant-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      setLogoPath(path);
      setLogoPreview(URL.createObjectURL(file));
    } catch {
      setError("Envoi du logo impossible, réessayez.");
    }
    setUploading(false);
  }

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/admin" });
        return;
      }
      try {
        await completeSignup({ data: {} });
      } catch {
        /* déjà créé */
      }
      setReady(true);
    };
    void run();
  }, [navigate]);

  function setSegmentCount(n: number) {
    setCount(n);
    setRewards((prev) =>
      Array.from({ length: n }, (_, i) => prev[i] ?? { name: "", quota: 1 }),
    );
  }

  async function finish() {
    setError(null);
    if (rewards.some((r) => !r.name.trim())) {
      setError("Donnez un nom à chaque récompense.");
      return;
    }
    setSaving(true);
    try {
      await saveWheelSetup({
        data: {
          goalType,
          goalUrl: goalUrl.trim(),
          frequency,
          rewardMode,
          rewards: rewards.map((r) => ({ name: r.name.trim(), quota: Number(r.quota) || 1 })),
          ...(logoPath ? { logoPath } : {}),
          completeOnboarding: true,
        },
      });
      navigate({ to: "/admin" });
    } catch {
      setSaving(false);
      setError("Enregistrement impossible, réessayez.");
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <p className="mb-2 text-sm font-extrabold uppercase tracking-widest text-ink/60">
        Étape {step} sur 4
      </p>
      <h1 className="mb-8 font-display text-3xl font-extrabold">
        {step === 1
          ? "Votre objectif 🎯"
          : step === 2
            ? "Vos récompenses 🎁"
            : step === 3
              ? "Fréquence des gains ⏱️"
              : "Votre logo 🖼️"}
      </h1>

      <div className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink">
        {step === 1 && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoalType(g.value)}
                  className={`ink-border min-h-[52px] rounded-2xl px-3 font-extrabold ${
                    goalType === g.value ? "bg-pink text-white" : "bg-yellow/30"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-extrabold">Lien de redirection</span>
              <input
                value={goalUrl}
                onChange={(e) => setGoalUrl(e.target.value)}
                placeholder="https://..."
                className="ink-border min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-extrabold">Nombre de segments gagnants</span>
              <select
                value={count}
                onChange={(e) => setSegmentCount(Number(e.target.value))}
                className="ink-border min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} segments
                  </option>
                ))}
              </select>
              <p className="ink-border mt-3 rounded-2xl bg-orange/15 px-4 py-3 text-sm font-bold">
                ⚠️ Attention : si vous avez beaucoup de joueurs mais peu de victoires autorisées par
                jour/semaine, l'expérience sera frustrante pour vos clients. Adaptez le nombre de
                récompenses et la fréquence de gains à votre trafic réel.
              </p>
            </label>
          </>
        )}

        {step === 2 && (
          <div className="mb-5">
            <p className="mb-2 text-sm font-extrabold">
              Voulez-vous que vos clients récupèrent leur récompense immédiatement ou lors de leur
              prochain passage ?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["immediate", "Immédiatement 🎁"],
                ["next_visit", "Prochain passage 🎫"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRewardMode(value)}
                  className={`ink-border min-h-[56px] rounded-2xl px-3 font-extrabold ${
                    rewardMode === value ? "bg-green text-white" : "bg-yellow/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-ink/60">
              {rewardMode === "immediate"
                ? "Le joueur verra : « Venez récupérer votre gain directement en caisse »."
                : "Le joueur recevra un code à usage unique à présenter lors de son prochain passage."}
            </p>
          </div>
        )}

        {step === 2 &&
          rewards.map((r, i) => (
            <div key={i} className="mb-3 flex gap-2">
              <input
                value={r.name}
                onChange={(e) =>
                  setRewards((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                placeholder={`Récompense ${i + 1}`}
                className="ink-border min-h-[52px] flex-1 rounded-full bg-yellow/30 px-5 font-bold outline-none"
              />
              <input
                type="number"
                min={1}
                value={r.quota}
                onChange={(e) =>
                  setRewards((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, quota: Number(e.target.value) } : x)),
                  )
                }
                className="ink-border min-h-[52px] w-20 rounded-full bg-white px-4 text-center font-bold outline-none"
              />
            </div>
          ))}

        {step === 3 && (
          <div>
          <p className="mb-2 font-extrabold">Réinitialisation du nombre de récompenses</p>
          <div className="grid grid-cols-2 gap-3">
            {(["day", "week"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`ink-border min-h-[64px] rounded-2xl px-3 font-extrabold ${
                  frequency === f ? "bg-green text-white" : "bg-yellow/30"
                }`}
              >
                {f === "day" ? "Par jour ☀️" : "Par semaine 📅"}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <p className="mb-4 text-sm font-bold text-ink/70">
              Ajoutez le logo de votre commerce : il s'affichera sur votre page de jeu, à la place
              réservée à votre marque. Format carré conseillé, moins de 2 Mo.
            </p>
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Aperçu de votre logo"
                className="ink-border-thick mx-auto mb-4 h-28 w-28 rounded-full bg-white object-contain p-2"
              />
            )}
            <label className="ink-border inline-block min-h-[52px] cursor-pointer rounded-full bg-yellow/40 px-6 py-3 font-extrabold uppercase">
              {uploading ? "Envoi..." : logoPath ? "Changer de logo" : "Choisir une image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-3 text-xs font-bold text-ink/50">
              Vous pouvez passer cette étape et l'ajouter plus tard dans votre espace.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm font-extrabold text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="ink-border min-h-[52px] flex-1 rounded-full bg-white px-4 font-extrabold uppercase"
            >
              Retour
            </button>
          )}
          <button
            onClick={() => (step < 4 ? setStep(step + 1) : finish())}
            disabled={saving || uploading}
            className="ink-border-thick min-h-[52px] flex-1 rounded-full bg-pink px-4 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
          >
            {step < 4 ? "Continuer →" : saving ? "Enregistrement..." : "Terminer 🎉"}
          </button>
        </div>
      </div>
    </main>
  );
}
