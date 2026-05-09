import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";

const GOOGLE_REVIEW_URL =
  "https://www.google.com/search?sca_esv=e6882076cd0c0955&rlz=1C1HKFL_frFR1200FR1204&sxsrf=ANbL-n4eccJrJU3vQNJpFuHr-mKfwp1ktQ:1778342859991&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOQ--0hAfI9iGs-PYfBVPpCdYPJMRc_v5K6Op4sA5P6uQCvtzvH1SDobGh3plgsYc9Y01rYjMfN8qBIV69uHKUzh2REgA&q=La+Gamelle+Avis&sa=X&ved=2ahUKEwizsNWzy6yUAxUKUqQEHewWCrwQ0bkNegQIKhAF&biw=1280&bih=585&dpr=1.5";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rollsy — Laissez un avis et tentez votre chance" },
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
  {
    icon: "📱",
    title: "Scannez le QR code",
    desc: "Disponible à l'accueil du restaurant",
  },
  {
    icon: "⭐",
    title: "Donnez votre avis Google",
    desc: "Partagez votre expérience en 30 secondes",
  },
  {
    icon: "🎰",
    title: "Tournez la roue",
    desc: "Et gagnez une récompense immédiate !",
  },
];

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
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#FFD700] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-700 opacity-30 blur-[120px]" />

      <section className="relative mx-auto flex max-w-2xl flex-col items-center px-5 pt-16 pb-12 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[#FFD700]"
        >
          ✨ Avis & récompenses
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="font-display text-shadow-gold text-6xl font-extrabold leading-none text-[#FFD700] sm:text-8xl"
        >
          ROLLSY
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 font-display text-2xl font-bold text-white sm:text-3xl"
        >
          Laissez un avis et tentez votre chance !
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-3 max-w-md text-base text-white/70 sm:text-lg"
        >
          Scannez, donnez votre avis, tournez la roue et gagnez une
          récompense.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10 flex w-full flex-col gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={{
              boxShadow: [
                "0 0 30px rgba(255,215,0,0.35)",
                "0 0 60px rgba(255,215,0,0.55)",
                "0 0 30px rgba(255,215,0,0.35)",
              ],
            }}
            transition={{
              boxShadow: { duration: 2.4, repeat: Infinity },
            }}
            onClick={handleReview}
            className="min-h-[64px] w-full rounded-2xl bg-gradient-to-b from-[#FFE066] to-[#FFD700] px-6 text-lg font-bold uppercase tracking-wide text-[#1a0533] transition"
          >
            Donner mon avis ⭐
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSpinAccess}
            className="glass min-h-[56px] w-full rounded-2xl px-6 text-base font-semibold text-white transition hover:bg-white/10"
          >
            J'ai déjà donné mon avis → Tourner la roue 🎰
          </motion.button>

          {warning && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 py-3 text-sm text-[#FFD700]"
            >
              {warning}
            </motion.p>
          )}
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 pb-20">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-white sm:text-3xl">
          Comment ça marche
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <div className="mb-3 text-5xl">{s.icon}</div>
              <div className="mb-2 font-display text-lg font-bold text-[#FFD700]">
                {i + 1}. {s.title}
              </div>
              <p className="text-sm text-white/70">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-white/50">
        Powered by <span className="font-semibold text-[#FFD700]">ROLLSY</span>{" "}
        — La solution avis & fidélité pour les commerçants
      </footer>
    </main>
  );
}
