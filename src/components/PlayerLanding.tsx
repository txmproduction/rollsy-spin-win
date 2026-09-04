import { useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import type { PublicMerchant } from "@/lib/player";

const steps = [
  { icon: "📱", title: "Scannez le QR code", desc: "Disponible à l'accueil du commerce", color: "bg-pink" },
  { icon: "⭐", title: "Faites l'action demandée", desc: "30 secondes, pas plus !", color: "bg-yellow" },
  { icon: "🎰", title: "Tournez la roue", desc: "Et gagnez une récompense immédiate !", color: "bg-green" },
];

function requiredActionMessage(goalType: string) {
  switch (goalType) {
    case "google":
      return "Vous devez d'abord laisser un avis pour débloquer la roue ! ⭐";
    case "instagram":
      return "Vous devez d'abord vous abonner à l'Instagram pour débloquer la roue ! 📸";
    case "tiktok":
      return "Vous devez d'abord vous abonner au TikTok pour débloquer la roue ! 🎵";
    default:
      return "Vous devez d'abord faire l'action demandée pour débloquer la roue ! ⭐";
  }
}

const shadowMap = ["shadow-pop-pink", "shadow-pop-yellow", "shadow-pop-green"] as const;

export default function PlayerLanding({ merchant }: { merchant: PublicMerchant }) {
  const navigate = useNavigate();
  const [warning, setWarning] = useState<string | null>(null);
  const reviewedKey = `hasReviewed:${merchant.slug}`;
  const goToWheel = () =>
    merchant.isDefault
      ? navigate({ to: "/roue" })
      : navigate({ to: "/m/$slug/roue", params: { slug: merchant.slug } });

  const handleReview = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem(reviewedKey, "true");
    if (merchant.goalUrl) window.open(merchant.goalUrl, "_blank", "noopener,noreferrer");
  };

  const handleSpinAccess = () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(reviewedKey) === "true") {
      void goToWheel();
    } else {
      setWarning(requiredActionMessage(merchant.goalType));
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
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

      <section className="relative mx-auto flex max-w-2xl flex-col items-center px-5 pb-10 pt-12 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: -10, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{ type: "spring", damping: 12 }}
          className="ink-border mb-6 inline-block rounded-full bg-yellow px-5 py-2 text-xs font-extrabold uppercase tracking-widest shadow-pop-ink"
        >
          🎪 {merchant.companyName}
        </motion.div>

        {merchant.logoUrl && (
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            src={merchant.logoUrl}
            alt={`Logo ${merchant.companyName}`}
            className="ink-border-thick mb-6 h-28 w-28 rounded-full bg-white object-contain p-2 shadow-pop-ink"
          />
        )}


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
          Tentez votre chance ! 🎲
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 max-w-md text-base font-semibold text-ink/80 sm:text-lg"
        >
          Une action, un tour de roue, une récompense immédiate 🎁
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
            {merchant.goalLabel} ⭐
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, rotate: 1, y: -2 }}
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={handleSpinAccess}
            className="ink-border min-h-[60px] w-full rounded-full bg-yellow px-6 text-base font-extrabold uppercase text-ink shadow-pop-ink"
          >
            C'est fait → Roue 🎰
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
              <div
                className={`ink-border mx-auto mb-3 inline-block rounded-full px-3 py-1 text-xs font-extrabold ${s.color} ${s.color === "bg-yellow" ? "text-ink" : "text-white"}`}
              >
                ÉTAPE {i + 1}
              </div>
              <div className="mb-2 font-display text-xl font-extrabold">{s.title}</div>
              <p className="text-sm font-semibold text-ink/70">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="ink-border-thick mx-4 mb-6 rounded-3xl bg-white px-6 py-5 text-center text-sm font-bold shadow-pop-pink sm:mx-auto sm:max-w-2xl">
        Powered by <span style={{ color: "#FF3DA6" }}>ROLLSY</span> 🎪 — La solution avis &
        fidélité pour les commerçants
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs font-semibold text-ink/60">
          <Link to="/inscription" className="underline">
            Essai gratuit 14 jours
          </Link>
          <Link to="/cgv" className="underline">
            CGV
          </Link>
          <Link to="/confidentialite" className="underline">
            Confidentialité
          </Link>
          <Link to="/admin" className="underline">
            Espace commerçant
          </Link>
        </div>
      </footer>
    </main>
  );
}
