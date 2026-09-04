import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rollsy — Transformez vos clients en avis 5 étoiles 🎰" },
      {
        name: "description",
        content:
          "Un QR code, une roue de la fortune : vos clients laissent un avis et gagnent une récompense. Essai gratuit 14 jours, sans carte bancaire.",
      },
      { property: "og:title", content: "Rollsy — Transformez vos clients en avis 5 étoiles" },
      {
        property: "og:description",
        content: "Un QR code, une roue, plus d'avis pour votre commerce. Essai gratuit 14 jours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  {
    icon: "📱",
    title: "Le client scanne",
    desc: "Votre QR code posé en caisse, sur la table ou sur le ticket.",
    color: "bg-pink",
    shadow: "shadow-pop-pink",
  },
  {
    icon: "⭐",
    title: "Il fait l'action",
    desc: "Avis Google, abonnement Instagram ou TikTok : c'est vous qui choisissez.",
    color: "bg-yellow",
    shadow: "shadow-pop-yellow",
  },
  {
    icon: "🎰",
    title: "Il tourne la roue",
    desc: "Et repart avec une récompense immédiate. Vous, avec un nouveau client fidèle.",
    color: "bg-green",
    shadow: "shadow-pop-green",
  },
];

const FEATURES = [
  { icon: "🎯", title: "Votre objectif, votre lien", desc: "Google, Instagram, TikTok ou tout autre lien, modifiable quand vous voulez." },
  { icon: "🎁", title: "Vos lots, vos quotas", desc: "Jusqu'à 8 récompenses avec un quota par jour ou par semaine." },
  { icon: "📊", title: "Statistiques en direct", desc: "Tours, gains et quotas atteints, mis à jour en temps réel." },
  { icon: "📥", title: "Votre fichier clients", desc: "Prénoms, téléphones et consentements SMS, exportables en un clic." },
];

const PLANS = [
  { name: "Starter", price: "0 €", note: "Pour tester", perks: ["1 roue", "QR code", "Stats de base"], color: "bg-white" },
  { name: "Pro", price: "49 € HT", note: "/ mois", perks: ["Roue illimitée", "Export clients", "Consentement SMS"], color: "bg-yellow", featured: true },
  { name: "Premium", price: "89 € HT", note: "/ mois", perks: ["Tout le Pro", "Multi-emplacements", "Support prioritaire"], color: "bg-white" },
];

function HomePage() {
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

      {/* HERO */}
      <section className="relative mx-auto flex max-w-2xl flex-col items-center px-5 pb-12 pt-14 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: -10, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{ type: "spring", damping: 12 }}
          className="ink-border mb-6 inline-block rounded-full bg-yellow px-5 py-2 text-xs font-extrabold uppercase tracking-widest shadow-pop-ink"
        >
          🎪 Essai gratuit 14 jours
        </motion.div>

        <h1
          className="mb-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl"
          style={{
            color: "#FF3DA6",
            WebkitTextStroke: "3px #1a1a1a",
            paintOrder: "stroke fill",
            filter: "drop-shadow(6px 6px 0 #1a1a1a)",
          }}
        >
          ROLLSY
        </h1>

        <p className="mb-3 font-display text-2xl font-extrabold sm:text-3xl">
          Transformez vos clients en avis 5 étoiles ⭐
        </p>
        <p className="mb-8 max-w-md font-bold text-ink/70">
          Un QR code, une roue de la fortune, une récompense. Vos clients jouent, votre commerce
          gagne en visibilité.
        </p>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Link
            to="/inscription"
            className="ink-border-thick flex min-h-[60px] items-center justify-center rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink"
          >
            Démarrer gratuitement 🚀
          </Link>
          <Link
            to="/admin"
            className="ink-border-thick flex min-h-[56px] items-center justify-center rounded-full bg-white px-6 font-extrabold uppercase shadow-pop-yellow"
          >
            J'ai déjà un compte 🔐
          </Link>
        </div>
        <p className="mt-4 text-xs font-bold text-ink/50">Sans carte bancaire · Sans engagement</p>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="mb-8 text-center font-display text-3xl font-extrabold">Comment ça marche ?</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`ink-border-thick rounded-3xl ${s.color} p-6 text-center ${s.shadow}`}
            >
              <div className="mb-3 text-5xl">{s.icon}</div>
              <p className="mb-2 font-display text-lg font-extrabold">{s.title}</p>
              <p className="text-sm font-bold text-ink/75">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FONCTIONNALITES */}
      <section className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="mb-8 text-center font-display text-3xl font-extrabold">
          Tout est pilotable par vous 🎛️
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="ink-border rounded-3xl bg-white p-5">
              <div className="mb-2 text-3xl">{f.icon}</div>
              <p className="mb-1 font-display text-lg font-extrabold">{f.title}</p>
              <p className="text-sm font-bold text-ink/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="mb-8 text-center font-display text-3xl font-extrabold">Tarifs simples 💸</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`ink-border-thick rounded-3xl ${p.color} p-6 text-center ${
                p.featured ? "shadow-pop-pink sm:-translate-y-2" : ""
              }`}
            >
              <p className="font-display text-lg font-extrabold uppercase">{p.name}</p>
              <p className="my-2 font-display text-3xl font-extrabold">{p.price}</p>
              <p className="mb-4 text-xs font-bold uppercase text-ink/60">{p.note}</p>
              <ul className="space-y-1 text-sm font-bold text-ink/75">
                {p.perks.map((perk) => (
                  <li key={perk}>✓ {perk}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/inscription"
            className="ink-border-thick inline-flex min-h-[60px] items-center rounded-full bg-pink px-8 font-extrabold uppercase text-white shadow-pop-ink"
          >
            Créer mon compte 🎉
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-3xl px-5 pb-10 pt-6 text-center">
        <div className="mb-4 flex flex-wrap justify-center gap-4 text-sm font-extrabold">
          <Link to="/inscription" className="underline">
            Essai gratuit
          </Link>
          <Link to="/admin" className="underline">
            Connexion
          </Link>
          <Link to="/cgv" className="underline">
            CGV
          </Link>
          <Link to="/confidentialite" className="underline">
            Confidentialité
          </Link>
        </div>
        <p className="text-xs font-bold text-ink/50">
          © {new Date().getFullYear()} Rollsy — contact.rollsy@gmail.com
        </p>
      </footer>
    </main>
  );
}
