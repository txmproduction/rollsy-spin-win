import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { getAdminData, verifyAdminPassword, resetRollsyData } from "@/lib/rollsy.functions";

type Spin = {
  id: string;
  client_id: string | null;
  reward_id: string | null;
  result: string;
  created_at: string;
};
type Reward = {
  id: string;
  name: string;
  short_label: string | null;
  frequency: string;
  quota: number;
};
type Client = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek() {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - day);
  return d;
}
function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

const GOOGLE_REVIEW_URL = "https://g.page/r/CUpOjpZbm_0kEAE/review";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin 🔐 — Rollsy" },
      { name: "description", content: "Espace administrateur Rollsy." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [spins, setSpins] = useState<Spin[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const qrWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAppUrl(window.location.origin + "/");
    const saved = sessionStorage.getItem("rollsy_admin_pwd");
    if (saved) {
      verifyAdminPassword({ data: { password: saved } }).then(({ ok }) => {
        if (ok) {
          setPwd(saved);
          setUnlocked(true);
        } else sessionStorage.removeItem("rollsy_admin_pwd");
      });
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    (async () => {
      try {
        const data = await getAdminData({ data: { password: pwd } });
        setSpins(data.spins as Spin[]);
        setRewards(data.rewards as Reward[]);
        setClients(data.clients as Client[]);
      } catch {
        setError("Session expirée, reconnectez-vous.");
        setUnlocked(false);
      }
      setLoading(false);
    })();
  }, [unlocked, pwd]);

  const stats = useMemo(() => {
    const todayStart = startOfToday().getTime();
    const weekStart = startOfWeek().getTime();
    const wins = spins.filter((s) => s.result === "win");
    const todaySpins = spins.filter((s) => new Date(s.created_at).getTime() >= todayStart);
    const rewardName = (id: string | null) =>
      rewards.find((r) => r.id === id)?.name ?? "Sans lot";

    const byReward = new Map<string, number>();
    for (const w of wins) {
      const key = rewardName(w.reward_id);
      byReward.set(key, (byReward.get(key) || 0) + 1);
    }

    const chicken = rewards.find((r) => /ailes de poulet/i.test(r.name));
    const chickenWeek = chicken
      ? wins.filter(
          (w) => w.reward_id === chicken.id && new Date(w.created_at).getTime() >= weekStart,
        ).length
      : 0;

    return {
      totalSpins: spins.length,
      totalWins: wins.length,
      todaySpins: todaySpins.length,
      todayWins: todaySpins.filter((s) => s.result === "win").length,
      byReward: [...byReward.entries()].sort((a, b) => b[1] - a[1]),
      chicken,
      chickenWeek,
    };
  }, [spins, rewards]);

  const exportClientsCsv = () => {
    const rewardName = (id: string | null) =>
      rewards.find((r) => r.id === id)?.name ?? "Sans lot";
    const header = ["Nom", "Téléphone", "Email", "Date d'inscription", "Participations", "Gains", "Lots gagnés"];
    const rows = clients.map((c) => {
      const mine = spins.filter((s) => s.client_id === c.id);
      const wins = mine.filter((s) => s.result === "win");
      return [
        c.name,
        c.phone,
        c.email,
        new Date(c.created_at).toLocaleString("fr-FR"),
        mine.length,
        wins.length,
        wins.map((w) => rewardName(w.reward_id)).join(" | "),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rollsy-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };



  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok } = await verifyAdminPassword({ data: { password: pwd } });
    if (ok) {
      sessionStorage.setItem("rollsy_admin_pwd", pwd);
      setUnlocked(true);
      setError("");
    } else setError("Mot de passe incorrect 🚫");
  };

  const downloadQR = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "rollsy-qr-code.png";
    a.click();
  };

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <motion.form
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          onSubmit={submit}
          className="ink-border-thick w-full max-w-sm rounded-3xl bg-white p-8 shadow-pop-pink"
        >
          <div className="mb-4 text-5xl">🔐</div>
          <h1 className="mb-2 font-display text-3xl font-extrabold">
            Espace admin
          </h1>
          <p className="mb-6 text-sm font-semibold text-ink/70">
            Saisissez le mot de passe.
          </p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe"
            className="ink-border mb-3 min-h-[56px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none placeholder:text-ink/40 focus:bg-yellow/60"
          />
          {error && (
            <p className="mb-3 text-sm font-bold text-orange-600">{error}</p>
          )}
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96, y: 2 }}
            type="submit"
            className="ink-border-thick min-h-[56px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink"
          >
            Entrer 🚀
          </motion.button>
        </motion.form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1
        className="font-display text-4xl font-extrabold sm:text-5xl"
        style={{
          color: "#FF3DA6",
          WebkitTextStroke: "2px #1a1a1a",
          paintOrder: "stroke fill",
          filter: "drop-shadow(4px 4px 0 #1a1a1a)",
        }}
      >
        ADMIN ROLLSY 🎪
      </h1>
      <p className="mt-4 text-base font-semibold text-ink/80">
        Imprimez ce QR code et placez-le sur vos tables ou à l'accueil. Vos
        clients scannent, laissent un avis et tournent la roue ! 🎉
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink"
        >
          <h2 className="mb-4 font-display text-xl font-extrabold">
            📱 Votre QR code
          </h2>
          <div
            ref={qrWrapRef}
            className="ink-border flex items-center justify-center rounded-2xl bg-white p-5"
          >
            {appUrl && (
              <QRCodeCanvas value={appUrl} size={220} level="H" includeMargin={false} />
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={downloadQR}
            className="ink-border-thick mt-4 min-h-[52px] w-full rounded-full bg-yellow px-5 font-extrabold uppercase shadow-pop-ink"
          >
            ⬇️ Télécharger
          </motion.button>
          <p className="mt-3 break-all text-xs font-semibold text-ink/50">{appUrl}</p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 1 }}
            className="ink-border-thick rounded-3xl bg-green p-6 shadow-pop-ink"
          >
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-ink">
              ⭐ URL avis Google
            </h3>
            <p className="break-all text-sm font-bold text-ink">{GOOGLE_REVIEW_URL}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-orange"
          >
            <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-ink/60">
              📊 Stats du jour
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="ink-border rounded-2xl bg-yellow p-4 text-center">
                <div className="font-display text-4xl font-extrabold">{stats.todaySpins}</div>
                <div className="text-xs font-extrabold uppercase">🎰 Tours</div>
              </div>
              <div className="ink-border rounded-2xl bg-pink p-4 text-center text-white">
                <div className="font-display text-4xl font-extrabold">{stats.todayWins}</div>

                <div className="text-xs font-extrabold uppercase">🎁 Gains</div>
              </div>
            </div>
          </motion.div>

          <button
            onClick={() => {
              sessionStorage.removeItem("rollsy_admin_pwd");
              setPwd("");
              setUnlocked(false);
            }}
            className="text-xs font-extrabold uppercase tracking-widest text-ink/50 hover:text-ink"
          >
            🚪 Se déconnecter
          </button>
        </div>
      </div>

      <section className="mt-10 space-y-6">
        <h2 className="font-display text-2xl font-extrabold">
          📈 Statistiques globales {loading && <span className="text-base">⏳</span>}
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="ink-border-thick rounded-3xl bg-yellow p-6 text-center shadow-pop-ink">
            <div className="font-display text-5xl font-extrabold">{stats.totalSpins}</div>
            <div className="mt-1 text-xs font-extrabold uppercase tracking-widest">
              🎰 Tours joués (total)
            </div>
          </div>
          <div className="ink-border-thick rounded-3xl bg-pink p-6 text-center text-white shadow-pop-ink">
            <div className="font-display text-5xl font-extrabold">{stats.totalWins}</div>
            <div className="mt-1 text-xs font-extrabold uppercase tracking-widest">
              🎁 Gains (total)
            </div>
          </div>
        </div>

        <div className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-pink">
          <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-ink/60">
            🏆 Répartition des gains par lot
          </h3>
          {stats.byReward.length === 0 ? (
            <p className="text-sm font-bold text-ink/50">Aucun gain enregistré pour l'instant.</p>
          ) : (
            <ul className="space-y-3">
              {stats.byReward.map(([name, count]) => (
                <li
                  key={name}
                  className="ink-border flex items-center justify-between rounded-2xl bg-green/30 px-4 py-3"
                >
                  <span className="font-extrabold">{name}</span>
                  <span className="font-display text-xl font-extrabold">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {stats.chicken && (
          <div className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-orange">
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-ink/60">
              🍗 {stats.chicken.name} — cette semaine
            </h3>
            <p className="font-display text-3xl font-extrabold">
              {stats.chickenWeek}/{stats.chicken.quota} déjà gagné cette semaine
            </p>
            <p className="mt-1 text-sm font-bold text-ink/60">
              Quota restant : {Math.max(0, stats.chicken.quota - stats.chickenWeek)}
            </p>
          </div>
        )}

        <div className="ink-border-thick rounded-3xl bg-white p-6 shadow-pop-ink">
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink/60">
            👥 Clients ({clients.length})
          </h3>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 2 }}
            onClick={exportClientsCsv}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-green px-5 font-extrabold uppercase shadow-pop-ink"
          >
            ⬇️ Exporter les clients en CSV
          </motion.button>
        </div>
      </section>
    </main>

  );
}
