import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";

const PASSWORD = "rollsy2024";
const GOOGLE_REVIEW_URL =
  "https://www.google.com/search?q=La+Gamelle+Avis";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Rollsy" },
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
  const [stats, setStats] = useState({ spins: 0, rewards: 0 });
  const qrWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAppUrl(window.location.origin + "/");
    if (sessionStorage.getItem("rollsy_admin") === "1") setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem("rollsy_stats");
    const all = raw ? JSON.parse(raw) : {};
    setStats(all[today] || { spins: 0, rewards: 0 });
  }, [unlocked]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === PASSWORD) {
      sessionStorage.setItem("rollsy_admin", "1");
      setUnlocked(true);
      setError("");
    } else {
      setError("Mot de passe incorrect.");
    }
  };

  const downloadQR = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "rollsy-qr-code.png";
    a.click();
  };

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="glass w-full max-w-sm rounded-3xl p-8"
        >
          <h1 className="mb-2 font-display text-2xl font-bold text-[#FFD700]">
            Espace admin
          </h1>
          <p className="mb-6 text-sm text-white/60">
            Saisissez le mot de passe pour accéder au panneau.
          </p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe"
            className="mb-3 min-h-[56px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#FFD700]/50"
          />
          {error && (
            <p className="mb-3 text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            className="min-h-[56px] w-full rounded-2xl bg-[#FFD700] px-6 font-bold text-[#1a0533]"
          >
            Entrer
          </button>
        </motion.form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold text-[#FFD700]">
        Admin Rollsy
      </h1>
      <p className="mt-2 text-white/70">
        Imprimez ce QR code et placez-le sur vos tables ou à l'accueil. Vos
        clients scannent, laissent un avis et tournent la roue !
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-white">
            Votre QR code
          </h2>
          <div
            ref={qrWrapRef}
            className="flex items-center justify-center rounded-2xl bg-white p-5"
          >
            {appUrl && (
              <QRCodeCanvas
                value={appUrl}
                size={220}
                level="H"
                includeMargin={false}
              />
            )}
          </div>
          <button
            onClick={downloadQR}
            className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#FFD700] px-5 font-bold text-[#1a0533]"
          >
            Télécharger le QR Code
          </button>
          <p className="mt-3 break-all text-xs text-white/50">{appUrl}</p>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-3xl p-6">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-white/50">
              URL avis Google
            </h3>
            <p className="break-all text-sm text-white/80">
              {GOOGLE_REVIEW_URL}
            </p>
          </div>
          <div className="glass rounded-3xl p-6">
            <h3 className="mb-4 text-xs uppercase tracking-widest text-white/50">
              Statistiques du jour
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-display text-3xl font-bold text-[#FFD700]">
                  {stats.spins}
                </div>
                <div className="text-xs uppercase text-white/60">
                  Tours
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-[#FFD700]">
                  {stats.rewards}
                </div>
                <div className="text-xs uppercase text-white/60">
                  Récompenses
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("rollsy_admin");
              setUnlocked(false);
            }}
            className="text-xs uppercase tracking-widest text-white/50 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}
