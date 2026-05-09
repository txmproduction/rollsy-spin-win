import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";

const GOOGLE_REVIEW_URL =
  "https://www.google.com/search?sca_esv=e6882076cd0c0955&rlz=1C1HKFL_frFR1200FR1204&sxsrf=ANbL-n4eccJrJU3vQNJpFuHr-mKfwp1ktQ:1778342859991&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOQ--0hAfI9iGs-PYfBVPpCdYPJMRc_v5K6Op4sA5P6uQCvtzvH1SDobGh3plgsYc9Y01rYjMfN8qBIV69uHKUzh2REgA&q=La+Gamelle+Avis&sa=X&ved=2ahUKEwizsNWzy6yUAxUKUqQEHewWCrwQ0bkNegQIKhAF&biw=1280&bih=585&dpr=1.5";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rollsy — Laissez un avis et tentez votre chance 🎉" },
      {
        name: "description",
        content:
          "Scannez, donnez votre avis Google et tournez la roue pour gagner une récompense immédiate.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: "📱", title: "Scannez le QR code", desc: "Disponible à l'accueil du restaurant", color: "bg-pink" },
  { icon: "⭐", title: "Donnez votre avis Google", desc: "Partagez votre expérience en 30 secondes", color: "bg-yellow" },
  { icon: "🎰", title: "Tournez la roue", desc: "Et gagnez une récompense immédiate !", color: "bg-green" },
];

const shadowMap = ["shadow-pop-pink", "shadow-pop-yellow", "shadow-pop-green"] as const;

function Index() {
  const navigate = useNavigate();
  const [warning, setWarning] = useState<string | null>(null);

  const handleReview = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hasReviewed", "true");
      window.open(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
    }
  };

  const handleSpinAccess = () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hasReviewed") === "true") {
      navigate({ to: "/roue" });
    } else {
      setWarning("Donnez votre avis d'abord pour débloquer la roue ! ⭐");
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* Floating decorations */}
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="pointer-events-none absolute left-4 top-24 text-4xl sm:left-10"
      >
        🎉
      </motion.div>
      <motion.div
        animate={{ y: [0, 12, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="pointer-events-none absolute right-6 top-32 text-4xl sm:right-16"
      >
        ⭐
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity }}
        className="pointer-events-none absolute bottom-32 left-8 text-4xl"
      >
        🍭
      </motion.div>

      <section className="relative mx-auto flex max-w-2xl flex-col items-center px-5 pt-12 pb-10 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: -10, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{ type: "spring", damping: 12 }}
          className="ink-border mb-6 inline-block rounded-full bg-yellow px-5 py-2 text-xs font-extrabold uppercase tracking-widest shadow-pop-ink"
        >
          🎪 Avis & récompenses
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 10, delay: 0.1 }}
          className="font-display text-7xl font-extrabold leading-none sm:text-9xl"
          style={{
            background: "linear-gradient(110deg, #FF3DA6 0%, #FF6B00 50%, #00D26A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            WebkitTextStroke: "3px #1a1a1a",
            paintOrder: "stroke fill",
            filter: "drop-shadow(6px 6px 0 #1a1a1a)",
          }}
        >
          ROLLSY
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 font-display text-2xl font-extrabold sm:text-3xl"
        >
          Laissez un avis et tentez votre chance ! 🎲
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 max-w-md text-base font-semibold text-ink/80 sm:text-lg"
        >
          Scannez, donnez votre avis, tournez la roue et gagnez une récompense 🎁
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex w-full flex-col gap-5"
        >
          <motion.button
            whileHover={{ scale: 1.05, rotate: -1, y: -3 }}
            whileTap={{ scale: 0.95, y: 2 }}
            animate={{ rotate: [-1, 1, -1] }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
            onClick={handleReview}
            className="ink-border-thick min-h-[64px] w-full rounded-full bg-pink px-6 text-lg font-extrabold uppercase tracking-wide text-white shadow-pop-ink-lg transition"
          >
            Donner mon avis ⭐
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, rotate: 1, y: -2 }}
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={handleSpinAccess}
            className="ink-border min-h-[60px] w-full rounded-full bg-yellow px-6 text-base font-extrabold uppercase text-ink shadow-pop-ink"
          >
            J'ai déjà donné mon avis → Roue 🎰
          </motion.button>

          {warning && (
            <motion.p
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="ink-border rounded-2xl bg-orange px-4 py-3 text-sm font-extrabold text-white shadow-pop-ink"
            >
              {warning}
            </motion.p>
          )}
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 pb-16">
        <h2 className="mb-10 text-center font-display text-3xl font-extrabold sm:text-4xl">
          Comment ça marche ? 🤔
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30, rotate: i % 2 === 0 ? -3 : 3 }}
              whileInView={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -2 : 2 }}
              whileHover={{ rotate: 0, scale: 1.04, y: -4 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", damping: 12 }}
              className={`ink-border-thick rounded-3xl bg-white p-6 text-center ${shadowMap[i]}`}
            >
              <div className="mb-3 text-6xl">{s.icon}</div>
              <div className={`ink-border mx-auto mb-3 inline-block rounded-full px-3 py-1 text-xs font-extrabold ${s.color} ${s.color === "bg-yellow" ? "text-ink" : "text-white"}`}>
                ÉTAPE {i + 1}
              </div>
              <div className="mb-2 font-display text-xl font-extrabold">
                {s.title}
              </div>
              <p className="text-sm font-semibold text-ink/70">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="ink-border-thick mx-4 mb-6 rounded-3xl bg-white px-6 py-5 text-center text-sm font-bold shadow-pop-pink sm:mx-auto sm:max-w-2xl">
        Powered by <span className="text-pink" style={{ color: "#FF3DA6" }}>ROLLSY</span> 🎪 — La solution avis & fidélité pour les commerçants
      </footer>
    </main>
  );
}
