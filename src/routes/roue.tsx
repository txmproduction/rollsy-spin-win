import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/roue")({
  head: () => ({
    meta: [
      { title: "Tournez la roue — Rollsy" },
      {
        name: "description",
        content: "Tournez la roue Rollsy et gagnez une récompense immédiate.",
      },
    ],
  }),
  component: RouePage,
});

type Segment = { label: string; color: string; weight: number };

const SEGMENTS: Segment[] = [
  { label: "20% de réduction", color: "#FF6B6B", weight: 20 },
  { label: "Dessert offert", color: "#FFD700", weight: 15 },
  { label: "Boisson offerte", color: "#4ECDC4", weight: 15 },
  { label: "Menu offert", color: "#45B7D1", weight: 5 },
  { label: "Essaie encore !", color: "#96CEB4", weight: 30 },
  { label: "10% de réduction", color: "#DDA0DD", weight: 15 },
];

const SEG_ANGLE = 360 / SEGMENTS.length;
const DAY_MS = 24 * 60 * 60 * 1000;

function pickWeighted(): number {
  const total = SEGMENTS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return SEGMENTS.length - 1;
}

function fireConfetti() {
  const burst = (opts: confetti.Options) =>
    confetti({
      particleCount: 80,
      spread: 70,
      colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#DDA0DD"],
      ...opts,
    });
  burst({ origin: { x: 0.2, y: 0.6 }, angle: 60 });
  burst({ origin: { x: 0.8, y: 0.6 }, angle: 120 });
  setTimeout(
    () => burst({ origin: { x: 0.5, y: 0.3 }, particleCount: 140, spread: 100 }),
    250,
  );
}

function RouePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [previousReward, setPreviousReward] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hasReviewed") !== "true") {
      sessionStorage.setItem(
        "rollsy_msg",
        "Donnez votre avis d'abord !",
      );
      navigate({ to: "/" });
      return;
    }
    const spunAt = Number(localStorage.getItem("spunAt") || 0);
    if (
      localStorage.getItem("hasSpun") === "true" &&
      Date.now() - spunAt < DAY_MS
    ) {
      setAlreadySpun(true);
      setPreviousReward(localStorage.getItem("reward"));
    } else if (spunAt && Date.now() - spunAt >= DAY_MS) {
      localStorage.removeItem("hasSpun");
    }
    setReady(true);
  }, [navigate]);

  const conicGradient = useMemo(() => {
    const stops = SEGMENTS.map((s, i) => {
      const start = i * SEG_ANGLE;
      const end = (i + 1) * SEG_ANGLE;
      return `${s.color} ${start}deg ${end}deg`;
    }).join(", ");
    return `conic-gradient(from -90deg, ${stops})`;
  }, []);

  const handleSpin = () => {
    if (spinning) return;
    const idx = pickWeighted();
    // Pointer at top (12 o'clock). With from -90deg, segment i's center is at i*SEG_ANGLE + SEG_ANGLE/2.
    // We want that center to land at 0deg (top). So rotate by -(center) plus full turns.
    const center = idx * SEG_ANGLE + SEG_ANGLE / 2;
    const turns = 6;
    const target = turns * 360 - center + (Math.random() * 6 - 3); // tiny jitter
    const final = rotation + target;
    setSpinning(true);
    setResult(null);
    setRotation(final);
    window.setTimeout(() => {
      const seg = SEGMENTS[idx];
      setResult(seg);
      setSpinning(false);
      localStorage.setItem("hasSpun", "true");
      localStorage.setItem("reward", seg.label);
      localStorage.setItem("spunAt", String(Date.now()));
      // increment stats for today
      const today = new Date().toISOString().slice(0, 10);
      const statsRaw = localStorage.getItem("rollsy_stats");
      const stats = statsRaw ? JSON.parse(statsRaw) : {};
      const day = stats[today] || { spins: 0, rewards: 0 };
      day.spins += 1;
      if (seg.label !== "Essaie encore !") day.rewards += 1;
      stats[today] = day;
      localStorage.setItem("rollsy_stats", JSON.stringify(stats));
      if (seg.label !== "Essaie encore !") fireConfetti();
    }, 4500);
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/60">
        Chargement…
      </main>
    );
  }

  if (alreadySpun) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <div className="glass max-w-md rounded-3xl p-8">
          <div className="mb-4 text-6xl">⏳</div>
          <h1 className="mb-3 font-display text-2xl font-bold text-[#FFD700]">
            Vous avez déjà tourné la roue aujourd'hui !
          </h1>
          {previousReward && previousReward !== "Essaie encore !" && (
            <p className="mb-3 text-white/80">
              Récompense gagnée :{" "}
              <span className="font-bold text-[#FFD700]">{previousReward}</span>
            </p>
          )}
          <p className="mb-6 text-sm text-white/70">
            Revenez après votre prochain avis.
          </p>
          <Link
            to="/"
            className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[#FFD700] px-6 text-base font-bold text-[#1a0533]"
          >
            Retour à l'accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-[#FFD700] opacity-10 blur-[140px]" />
      </div>

      <Link
        to="/"
        className="mb-6 self-start text-sm text-white/60 transition hover:text-[#FFD700]"
      >
        ← Accueil
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-display text-3xl font-extrabold text-[#FFD700] sm:text-4xl"
      >
        Tournez la roue !
      </motion.h1>
      <p className="mt-2 mb-8 text-center text-sm text-white/70">
        Bonne chance 🍀
      </p>

      <div className="relative mx-auto" style={{ width: "min(88vw, 360px)" }}>
        {/* Pointer */}
        <div className="absolute left-1/2 -top-3 z-20 -translate-x-1/2">
          <div
            className="h-0 w-0"
            style={{
              borderLeft: "16px solid transparent",
              borderRight: "16px solid transparent",
              borderTop: "26px solid #FFD700",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))",
            }}
          />
        </div>

        {/* Wheel */}
        <div
          className="relative aspect-square w-full rounded-full p-2"
          style={{
            background:
              "linear-gradient(135deg, #FFD700, #b8860b 50%, #FFD700)",
            boxShadow:
              "0 0 50px rgba(255,215,0,0.45), inset 0 0 20px rgba(0,0,0,0.4)",
          }}
        >
          <motion.div
            ref={wheelRef}
            animate={{ rotate: rotation }}
            transition={{ duration: 4.5, ease: [0.17, 0.67, 0.2, 1] }}
            className="relative h-full w-full rounded-full"
            style={{ background: conicGradient }}
          >
            {SEGMENTS.map((s, i) => {
              const angle = i * SEG_ANGLE + SEG_ANGLE / 2;
              return (
                <div
                  key={s.label}
                  className="pointer-events-none absolute left-1/2 top-1/2 origin-left"
                  style={{
                    transform: `translateY(-50%) rotate(${angle - 90}deg)`,
                    width: "50%",
                  }}
                >
                  <div
                    className="px-4 text-right text-[11px] font-bold uppercase leading-tight text-white sm:text-xs"
                    style={{
                      textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </motion.div>
          {/* Hub */}
          <div className="absolute left-1/2 top-1/2 z-10 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#1a0533] bg-gradient-to-b from-[#FFE066] to-[#FFD700] shadow-lg" />
        </div>
      </div>

      <motion.button
        whileHover={!spinning ? { scale: 1.03 } : undefined}
        whileTap={!spinning ? { scale: 0.97 } : undefined}
        disabled={spinning}
        onClick={handleSpin}
        className="mt-10 min-h-[64px] w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#FFE066] to-[#FFD700] px-6 text-lg font-extrabold uppercase tracking-wide text-[#1a0533] shadow-[0_0_40px_rgba(255,215,0,0.4)] transition disabled:opacity-60"
      >
        {spinning ? "La roue tourne…" : "Tourner la roue 🎰"}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.7, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-md rounded-3xl p-8 text-center"
            >
              {result.label !== "Essaie encore !" ? (
                <>
                  <div className="mb-2 text-6xl">🏆</div>
                  <h2 className="font-display text-3xl font-extrabold text-[#FFD700]">
                    FÉLICITATIONS !
                  </h2>
                  <p className="mt-4 text-sm text-white/70">Vous avez gagné</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    {result.label}
                  </p>
                  <p className="mt-5 text-sm text-white/80">
                    Montrez ce message à notre équipe pour profiter de votre
                    récompense.
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-[#FFD700]">
                    Valable aujourd'hui uniquement
                  </p>
                  <button
                    onClick={() => {
                      const text = `J'ai gagné ${result.label} avec Rollsy 🎰✨`;
                      if (navigator.share) {
                        navigator.share({ text }).catch(() => {});
                      } else {
                        navigator.clipboard?.writeText(text);
                      }
                    }}
                    className="mt-6 min-h-[52px] w-full rounded-2xl border border-[#FFD700]/40 bg-white/5 px-5 font-semibold text-white transition hover:bg-white/10"
                  >
                    Partager 📸
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-2 text-6xl">😅</div>
                  <h2 className="font-display text-3xl font-extrabold text-white">
                    Oh non !
                  </h2>
                  <p className="mt-4 text-white/80">
                    Pas de chance cette fois...
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    Merci quand même pour votre avis !
                  </p>
                  <p className="mt-2 text-sm text-[#FFD700]">
                    Revenez nous voir bientôt 😊
                  </p>
                </>
              )}
              <button
                onClick={() => setResult(null)}
                className="mt-6 text-xs uppercase tracking-widest text-white/50 hover:text-white"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
