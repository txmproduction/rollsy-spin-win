import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/roue")({
  head: () => ({
    meta: [
      { title: "Tournez la roue 🎰 — Rollsy" },
      { name: "description", content: "Tournez la roue Rollsy et gagnez une récompense immédiate." },
    ],
  }),
  component: RouePage,
});

type Segment = { label: string; short: string; color: string; weight: number; emoji: string };

const SEGMENTS: Segment[] = [
  { label: "20% de réduction", short: "-20%",   color: "#FF3DA6", weight: 20, emoji: "💸" },
  { label: "Dessert offert",   short: "Dessert", color: "#FFE600", weight: 15, emoji: "🍰" },
  { label: "Boisson offerte",  short: "Boisson", color: "#00D26A", weight: 15, emoji: "🥤" },
  { label: "Menu offert",      short: "MENU !",  color: "#FF6B00", weight: 5,  emoji: "🍽️" },
  { label: "Essaie encore !",  short: "Réessaie", color: "#A855F7", weight: 30, emoji: "🔁" },
  { label: "10% de réduction", short: "-10%",   color: "#00B4FF", weight: 15, emoji: "🎁" },
];

const SEG_ANGLE = 360 / SEGMENTS.length;
const DAY_MS = 24 * 60 * 60 * 1000;
const CONFETTI_COLORS = ["#FF3DA6", "#FFE600", "#00D26A", "#FF6B00"];

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
    confetti({ particleCount: 90, spread: 75, colors: CONFETTI_COLORS, ...opts });
  burst({ origin: { x: 0.2, y: 0.6 }, angle: 60 });
  burst({ origin: { x: 0.8, y: 0.6 }, angle: 120 });
  setTimeout(() => burst({ origin: { x: 0.5, y: 0.3 }, particleCount: 160, spread: 110 }), 250);
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
      navigate({ to: "/" });
      return;
    }
    const spunAt = Number(localStorage.getItem("spunAt") || 0);
    if (localStorage.getItem("hasSpun") === "true" && Date.now() - spunAt < DAY_MS) {
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
    // from 0deg => segment 0 starts at top (12 o'clock), goes clockwise
    return `conic-gradient(from 0deg, ${stops})`;
  }, []);

  const handleSpin = () => {
    if (spinning) return;
    const idx = pickWeighted();
    const center = idx * SEG_ANGLE + SEG_ANGLE / 2;
    const turns = 6;
    const target = turns * 360 - center + (Math.random() * 6 - 3);
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
      <main className="flex min-h-screen items-center justify-center font-bold text-ink/70">
        Chargement…
      </main>
    );
  }

  if (alreadySpun) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <div className="ink-border-thick max-w-md rounded-3xl bg-white p-8 shadow-pop-pink">
          <div className="mb-4 text-7xl">⏳</div>
          <h1 className="mb-3 font-display text-2xl font-extrabold">
            Vous avez déjà tourné aujourd'hui !
          </h1>
          {previousReward && previousReward !== "Essaie encore !" && (
            <div className="ink-border mx-auto mb-4 inline-block rounded-full bg-yellow px-4 py-2 text-sm font-extrabold shadow-pop-ink">
              🎁 {previousReward}
            </div>
          )}
          <p className="mb-6 text-sm font-semibold text-ink/70">
            Revenez après votre prochain avis 😊
          </p>
          <Link
            to="/"
            className="ink-border-thick inline-flex min-h-[56px] items-center justify-center rounded-full bg-pink px-6 text-base font-extrabold uppercase text-white shadow-pop-ink"
          >
            ← Retour
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-8">
      <Link
        to="/"
        className="ink-border mb-6 self-start rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase shadow-pop-ink"
      >
        ← Accueil
      </Link>

      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 10 }}
        className="text-center font-display text-4xl font-extrabold sm:text-5xl"
        style={{
          color: "#FF3DA6",
          WebkitTextStroke: "2px #1a1a1a",
          paintOrder: "stroke fill",
          filter: "drop-shadow(4px 4px 0 #1a1a1a)",
        }}
      >
        TOURNEZ LA ROUE !
      </motion.h1>
      <p className="mt-3 mb-6 text-center text-base font-bold text-ink/80">
        Bonne chance 🍀✨
      </p>

      <div className="relative mx-auto" style={{ width: "min(88vw, 360px)" }}>
        {/* Pointer */}
        <div className="absolute left-1/2 -top-4 z-20 -translate-x-1/2">
          <div
            className="h-0 w-0"
            style={{
              borderLeft: "18px solid transparent",
              borderRight: "18px solid transparent",
              borderTop: "30px solid #1a1a1a",
            }}
          />
          <div
            className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft: "13px solid transparent",
              borderRight: "13px solid transparent",
              borderTop: "22px solid #FFE600",
            }}
          />
        </div>

        {/* Wheel */}
        <div
          className="relative aspect-square w-full rounded-full p-2"
          style={{
            background: "#1a1a1a",
            boxShadow: "8px 8px 0 0 #1a1a1a",
          }}
        >
          <motion.div
            ref={wheelRef}
            animate={{ rotate: rotation }}
            transition={{ duration: 4.5, ease: [0.17, 0.67, 0.2, 1] }}
            className="relative h-full w-full overflow-hidden rounded-full"
            style={{ background: conicGradient, border: "4px solid #1a1a1a" }}
          >
            {SEGMENTS.map((s, i) => {
              // segment center angle, measured clockwise from top (12 o'clock)
              const center = i * SEG_ANGLE + SEG_ANGLE / 2;
              return (
                <div
                  key={s.label}
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={{
                    // 1) move to center, 2) rotate so up-axis points to segment center, 3) push outward, 4) counter-rotate text upright-ish
                    transform: `translate(-50%, -50%) rotate(${center}deg) translateY(-58%)`,
                    width: "44%",
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center gap-0.5 text-center"
                    style={{ transform: `rotate(${-center}deg)` }}
                  >
                    <span className="text-3xl drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                      {s.emoji}
                    </span>
                    <span
                      className="font-display text-[13px] font-extrabold uppercase leading-tight text-ink sm:text-sm"
                      style={{ textShadow: "1px 1px 0 rgba(255,255,255,0.6)" }}
                    >
                      {s.short}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Dots */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * 360) / 12;
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${a}deg) translateY(calc(-50% + 14px))`,
                    border: "2px solid #1a1a1a",
                  }}
                />
              );
            })}
          </motion.div>
          {/* Hub */}
          <div
            className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-2xl"
            style={{
              background: "linear-gradient(135deg, #FFE600, #FF6B00)",
              border: "4px solid #1a1a1a",
              boxShadow: "0 4px 0 0 #1a1a1a",
            }}
          >
            🎯
          </div>
        </div>
      </div>

      <motion.button
        whileHover={!spinning ? { scale: 1.06, rotate: -1, y: -3 } : undefined}
        whileTap={!spinning ? { scale: 0.94, y: 2 } : undefined}
        animate={!spinning ? { rotate: [-1, 1, -1] } : undefined}
        transition={{ rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } }}
        disabled={spinning}
        onClick={handleSpin}
        className="ink-border-thick mt-10 min-h-[64px] w-full max-w-sm rounded-full bg-pink px-6 text-lg font-extrabold uppercase tracking-wide text-white shadow-pop-ink-lg transition disabled:opacity-70"
      >
        {spinning ? "🌀 Ça tourne…" : "TOURNER LA ROUE 🎰"}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50, rotate: -8 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", damping: 14 }}
              onClick={(e) => e.stopPropagation()}
              className={`ink-border-thick relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-pop-ink-lg ${
                result.label !== "Essaie encore !" ? "shadow-pop-pink" : "shadow-pop-orange"
              }`}
            >
              {result.label !== "Essaie encore !" ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
                    className="mb-2 text-7xl"
                  >
                    🏆
                  </motion.div>
                  <h2
                    className="font-display text-4xl font-extrabold"
                    style={{
                      color: "#FF3DA6",
                      WebkitTextStroke: "2px #1a1a1a",
                      paintOrder: "stroke fill",
                    }}
                  >
                    FÉLICITATIONS !
                  </h2>
                  <p className="mt-5 text-sm font-bold uppercase tracking-widest text-ink/60">
                    Vous avez gagné
                  </p>
                  <div className="ink-border-thick mx-auto mt-3 inline-block rounded-2xl bg-yellow px-6 py-3 shadow-pop-ink">
                    <span className="font-display text-2xl font-extrabold">
                      {result.emoji} {result.label}
                    </span>
                  </div>
                  <p className="mt-6 text-sm font-semibold text-ink/80">
                    Montrez ce message à notre équipe pour profiter de votre récompense 🙌
                  </p>
                  <div className="ink-border mt-3 inline-block rounded-full bg-orange px-3 py-1 text-xs font-extrabold uppercase text-white">
                    Valable aujourd'hui uniquement
                  </div>
                  <button
                    onClick={() => {
                      const text = `J'ai gagné ${result.label} avec Rollsy 🎰✨`;
                      if (navigator.share) navigator.share({ text }).catch(() => {});
                      else navigator.clipboard?.writeText(text);
                    }}
                    className="ink-border-thick mt-6 min-h-[52px] w-full rounded-full bg-green px-5 font-extrabold uppercase text-ink shadow-pop-ink"
                  >
                    📸 Partager
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-2 text-7xl">😅</div>
                  <h2
                    className="font-display text-4xl font-extrabold"
                    style={{
                      color: "#FF6B00",
                      WebkitTextStroke: "2px #1a1a1a",
                      paintOrder: "stroke fill",
                    }}
                  >
                    OH NON !
                  </h2>
                  <p className="mt-4 font-bold">Pas de chance cette fois...</p>
                  <p className="mt-2 text-sm font-semibold text-ink/70">
                    Merci quand même pour votre avis ! ⭐
                  </p>
                  <p className="mt-2 font-extrabold" style={{ color: "#FF3DA6" }}>
                    Revenez nous voir bientôt 😊
                  </p>
                </>
              )}
              <button
                onClick={() => setResult(null)}
                className="mt-6 text-xs font-extrabold uppercase tracking-widest text-ink/50 hover:text-ink"
              >
                Fermer ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
