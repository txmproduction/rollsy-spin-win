import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMerchantAdminData,
  resetRollsyData,
  saveWheelSetup,
  completeSignup,
  markSpinCodeUsed,
} from "@/lib/rollsy.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace commerçant — Rollsy" },
      { name: "description", content: "Statistiques, QR code et configuration de votre roue Rollsy." },
      { property: "og:title", content: "Espace commerçant — Rollsy" },
      { property: "og:description", content: "Suivez vos avis, vos gains et configurez votre roue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type AdminData = Awaited<ReturnType<typeof getMerchantAdminData>>;

const GOALS = [
  { value: "google", label: "Avis Google ⭐" },
  { value: "instagram", label: "Instagram 📸" },
  { value: "tiktok", label: "TikTok 🎵" },
  { value: "autre", label: "Autre 🔗" },
] as const;

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek() {
  const d = startOfDay();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function maskPhone(phone: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••";
  return `${digits.slice(0, 2)} •• •• •• ${digits.slice(-2)}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ink-border-thick mb-6 rounded-3xl bg-white p-6 shadow-pop-pink">
      <h2 className="mb-4 font-display text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [booting, setBooting] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);

  const load = useCallback(async () => {
    try {
      await completeSignup({ data: {} });
      const d = await getMerchantAdminData();
      setData(d);
      if (!d.merchant.onboarding_completed) navigate({ to: "/onboarding" });
    } catch {
      setData(null);
    }
  }, [navigate]);

  useEffect(() => {
    const run = async () => {
      const { data: s } = await supabase.auth.getSession();
      if (s.session) {
        setSignedIn(true);
        await load();
      }
      setBooting(false);
    };
    void run();
  }, [load]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      setAuthError("Email ou mot de passe incorrect.");
      return;
    }
    setSignedIn(true);
    await load();
  }

  const stats = useMemo(() => {
    if (!data) return null;
    const dayStart = startOfDay().getTime();
    const weekStart = startOfWeek().getTime();
    const spins = data.spins;
    const wins = spins.filter((s) => s.result === "win");
    const byReward = data.rewards.map((r) => {
      const periodStart = r.frequency === "day" ? dayStart : weekStart;
      const period = wins.filter(
        (s) => s.reward_id === r.id && new Date(s.created_at).getTime() >= periodStart,
      ).length;
      return {
        id: r.id,
        name: r.name,
        quota: r.quota,
        period,
        total: wins.filter((s) => s.reward_id === r.id).length,
        frequency: r.frequency,
      };
    });
    return {
      totalSpins: spins.length,
      totalWins: wins.length,
      todaySpins: spins.filter((s) => new Date(s.created_at).getTime() >= dayStart).length,
      todayWins: wins.filter((s) => new Date(s.created_at).getTime() >= dayStart).length,
      byReward,
    };
  }, [data]);

  const playerUrl =
    data && typeof window !== "undefined" ? `${window.location.origin}/m/${data.merchant.slug}` : "";

  function downloadQr() {
    const canvas = document.querySelector<HTMLCanvasElement>("#rollsy-qr canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `rollsy-${data?.merchant.slug ?? "qr"}.png`;
    a.click();
  }

  function exportCsv() {
    if (!data) return;
    const header = ["Nom", "Téléphone", "Email", "Inscription", "CGU", "SMS", "Consentement"];
    const rows = data.clients.map((c) => [
      c.name ?? "",
      c.phone ?? "",
      c.email ?? "",
      new Date(c.created_at).toLocaleString("fr-FR"),
      c.terms_accepted ? "oui" : "non",
      c.marketing_consent ? "oui" : "non",
      c.consent_at ? new Date(c.consent_at).toLocaleString("fr-FR") : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-rollsy.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Configuration modifiable ---
  const [goalType, setGoalType] = useState("google");
  const [goalUrl, setGoalUrl] = useState("");
  const [frequency, setFrequency] = useState<"day" | "week">("week");
  const [rewardMode, setRewardMode] = useState<"immediate" | "next_visit">("immediate");
  const [rewardRows, setRewardRows] = useState<{ name: string; quota: number }[]>([]);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhones, setShowPhones] = useState(false);

  async function handleLogoFile(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSavedMsg("Le logo doit peser moins de 2 Mo.");
      return;
    }
    setUploading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) throw new Error("no session");
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${uid}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("merchant-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setLogoPath(path);
      setLogoPreview(URL.createObjectURL(file));
      setSavedMsg("Logo prêt : cliquez sur Enregistrer pour l'appliquer.");
    } catch {
      setSavedMsg("Envoi du logo impossible, réessayez.");
    }
    setUploading(false);
  }

  useEffect(() => {
    if (!data) return;
    setGoalType(data.merchant.goal_type ?? "google");
    setGoalUrl(data.merchant.goal_url ?? "");
    setFrequency((data.rewards[0]?.frequency as "day" | "week") ?? "week");
    setRewardMode(data.merchant.reward_mode === "next_visit" ? "next_visit" : "immediate");
    setRewardRows(data.rewards.map((r) => ({ name: r.name, quota: r.quota })));
    setLogoPath(null);
    setLogoPreview(data.logoUrl ?? null);
  }, [data]);

  async function saveConfig() {
    setBusy(true);
    setSavedMsg(null);
    try {
      await saveWheelSetup({
        data: {
          goalType,
          goalUrl: goalUrl.trim(),
          frequency,
          rewardMode,
          rewards: rewardRows.map((r) => ({ name: r.name.trim(), quota: Number(r.quota) || 1 })),
          ...(logoPath ? { logoPath } : {}),
          completeOnboarding: true,
        },
      });
      await load();
      setSavedMsg("Configuration enregistrée ✅");
    } catch {
      setSavedMsg("Échec de l'enregistrement.");
    }
    setBusy(false);
  }

  const codeSpins = useMemo(
    () => (data?.spins ?? []).filter((s) => s.result === "win" && s.code),
    [data],
  );

  async function toggleCode(spinId: string, used: boolean) {
    setBusy(true);
    try {
      await markSpinCodeUsed({ data: { spinId, used } });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!confirm("Supprimer tous les tours et clients de votre compte ? Action irréversible.")) return;
    setBusy(true);
    try {
      await resetRollsyData();
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (booting) return null;

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-sm px-4 py-20">
        <h1 className="mb-6 font-display text-3xl font-extrabold">Espace commerçant 🔐</h1>
        <form onSubmit={handleLogin} className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="ink-border mb-3 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="ink-border mb-4 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          {authError && <p className="mb-3 text-sm font-extrabold text-red-600">{authError}</p>}
          <button
            type="submit"
            disabled={busy}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
          >
            Se connecter
          </button>
        </form>
        <p className="mt-6 text-center text-sm font-bold text-ink/60">
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="underline">
            Essai gratuit 14 jours
          </Link>
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">
        Chargement de votre espace...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">{data.merchant.company_name}</h1>
          <p className="font-bold text-ink/60">Espace commerçant Rollsy</p>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            setSignedIn(false);
            setData(null);
          }}
          className="ink-border min-h-[44px] rounded-full bg-white px-5 font-extrabold uppercase"
        >
          Déconnexion
        </button>
      </div>

      {stats && (
        <Card title="Statistiques">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Tours aujourd'hui", stats.todaySpins],
              ["Gains aujourd'hui", stats.todayWins],
              ["Tours au total", stats.totalSpins],
              ["Gains au total", stats.totalWins],
            ].map(([label, value]) => (
              <div key={String(label)} className="ink-border rounded-2xl bg-yellow/30 p-4 text-center">
                <p className="font-display text-2xl font-extrabold">{value as number}</p>
                <p className="text-xs font-bold text-ink/70">{label as string}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {stats.byReward.map((r) => (
              <div
                key={r.id}
                className="ink-border flex items-center justify-between rounded-2xl bg-white px-4 py-3"
              >
                <span className="font-extrabold">{r.name}</span>
                <span className="font-bold">
                  {r.period}/{r.quota} {r.frequency === "day" ? "aujourd'hui" : "cette semaine"}
                  {r.period >= r.quota && " · quota atteint"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Votre QR code">
        <div id="rollsy-qr" className="mb-4 inline-block rounded-2xl bg-white p-4">
          {playerUrl && <QRCodeCanvas value={playerUrl} size={200} includeMargin />}
        </div>
        <p className="mb-4 break-all text-sm font-bold text-ink/70">{playerUrl}</p>
        <button
          onClick={downloadQr}
          className="ink-border-thick min-h-[52px] rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
        >
          Télécharger le QR code ⬇️
        </button>
      </Card>

      <Card title="Logo de votre commerce">
        <div className="flex flex-wrap items-center gap-4">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Votre logo"
              className="ink-border-thick h-24 w-24 rounded-full bg-white object-contain p-2"
            />
          ) : (
            <div className="ink-border flex h-24 w-24 items-center justify-center rounded-full bg-yellow/30 text-2xl">
              🖼️
            </div>
          )}
          <div>
            <label className="ink-border inline-block cursor-pointer rounded-full bg-yellow/40 px-6 py-3 font-extrabold uppercase">
              {uploading ? "Envoi..." : logoPreview ? "Changer de logo" : "Choisir une image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-2 text-xs font-bold text-ink/60">
              Carré, moins de 2 Mo. Il s'affiche sur votre page de jeu après enregistrement.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Configuration de la roue">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGoalType(g.value)}
              className={`ink-border min-h-[48px] rounded-2xl px-3 font-extrabold ${
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
            className="ink-border min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
        </label>
        <div className="mb-4 grid grid-cols-2 gap-3">
          {(["day", "week"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`ink-border min-h-[48px] rounded-2xl px-3 font-extrabold ${
                frequency === f ? "bg-green text-white" : "bg-yellow/30"
              }`}
            >
              {f === "day" ? "Par jour ☀️" : "Par semaine 📅"}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <p className="mb-2 text-sm font-extrabold">Récupération de la récompense</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["immediate", "Immédiatement 🎁"],
              ["next_visit", "Prochain passage 🎫"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setRewardMode(value)}
                className={`ink-border min-h-[48px] rounded-2xl px-3 font-extrabold ${
                  rewardMode === value ? "bg-green text-white" : "bg-yellow/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="ink-border mb-4 rounded-2xl bg-orange/15 px-4 py-3 text-sm font-bold">
          ⚠️ Attention : si vous avez beaucoup de joueurs mais peu de victoires autorisées par
          jour/semaine, l'expérience sera frustrante pour vos clients. Adaptez le nombre de
          récompenses et la fréquence de gains à votre trafic réel.
        </p>
        {rewardRows.map((r, i) => (
          <div key={i} className="mb-3 flex gap-2">
            <input
              value={r.name}
              onChange={(e) =>
                setRewardRows((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
              className="ink-border min-h-[52px] flex-1 rounded-full bg-yellow/30 px-5 font-bold outline-none"
            />
            <input
              type="number"
              min={1}
              value={r.quota}
              onChange={(e) =>
                setRewardRows((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, quota: Number(e.target.value) } : x)),
                )
              }
              className="ink-border min-h-[52px] w-20 rounded-full bg-white px-4 text-center font-bold outline-none"
            />
            <button
              onClick={() => setRewardRows((prev) => prev.filter((_, j) => j !== i))}
              className="ink-border min-h-[52px] rounded-full bg-white px-4 font-extrabold"
              aria-label="Supprimer la récompense"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setRewardRows((prev) => [...prev, { name: "", quota: 1 }])}
            disabled={rewardRows.length >= 8}
            className="ink-border min-h-[52px] rounded-full bg-white px-5 font-extrabold uppercase disabled:opacity-40"
          >
            + Ajouter un lot
          </button>
          <button
            onClick={saveConfig}
            disabled={busy || rewardRows.length < 2}
            className="ink-border-thick min-h-[52px] rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
        {savedMsg && <p className="mt-3 text-sm font-extrabold">{savedMsg}</p>}
      </Card>

      {rewardMode === "next_visit" && (
        <Card title="Codes de récompense">
          {codeSpins.length === 0 ? (
            <p className="text-sm font-bold text-ink/70">Aucun code généré pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {codeSpins.map((sp) => {
                const reward = data.rewards.find((r) => r.id === sp.reward_id);
                return (
                  <div
                    key={sp.id}
                    className="ink-border flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-extrabold">{sp.code}</p>
                      <p className="text-xs font-bold text-ink/60">
                        {reward?.name ?? "Lot"} · {new Date(sp.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleCode(sp.id, !sp.code_used)}
                      disabled={busy}
                      className={`ink-border min-h-[44px] rounded-full px-4 text-sm font-extrabold uppercase disabled:opacity-50 ${
                        sp.code_used ? "bg-white text-ink/60" : "bg-green text-white"
                      }`}
                    >
                      {sp.code_used ? "Utilisé ✓ (annuler)" : "Marquer utilisé"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card title={`Clients (${data.clients.length})`}>
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={exportCsv}
            className="ink-border-thick min-h-[52px] rounded-full bg-green px-6 font-extrabold uppercase text-white shadow-pop-ink"
          >
            Exporter les clients en CSV 📥
          </button>
        </div>
        {data.clients.length === 0 ? (
          <p className="text-sm font-bold text-ink/70">Aucun client pour le moment.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {data.clients.slice(0, 100).map((c) => (
              <ClientRow key={c.id} client={c} />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs font-bold text-ink/50">
          Les numéros sont masqués par défaut. Cliquez sur l'œil pour afficher celui d'un client. Ils restent complets dans l'export CSV.
        </p>
      </Card>

      <section className="mb-10 rounded-3xl border-4 border-red-500 bg-white p-6">
        <h2 className="mb-2 font-display text-xl font-extrabold text-red-600">Zone dangereuse</h2>
        <p className="mb-4 text-sm font-bold text-ink/70">
          Supprime définitivement vos tours et vos clients. Les lots et réglages sont conservés.
        </p>
        <button
          onClick={handleReset}
          disabled={busy}
          className="min-h-[52px] rounded-full border-4 border-red-600 bg-red-500 px-6 font-extrabold uppercase text-white disabled:opacity-50"
        >
          Réinitialiser les données 🗑️
        </button>
      </section>
    </main>
  );
}
