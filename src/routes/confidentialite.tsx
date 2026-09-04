import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Rollsy" },
      {
        name: "description",
        content:
          "Données collectées, finalités, durées de conservation et vos droits sur le service Rollsy.",
      },
      { property: "og:title", content: "Politique de confidentialité — Rollsy" },
      {
        property: "og:description",
        content: "Vos données, vos droits : traitement, durée de conservation et contacts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Données collectées",
    body: [
      "Via ce site : les informations que vous nous transmettez volontairement dans le formulaire de contact (nom du commerce, type d'activité, ville, coordonnées, message) et des données de mesure d'audience anonymisées, uniquement après votre consentement.",
      "Via le service Rollsy : les coordonnées que vos clients renseignent pour recevoir leur lot, traitées pour votre compte.",
    ],
  },
  {
    title: "Finalités",
    body: [
      "Répondre à vos demandes, vous présenter le service, améliorer le site et, si vous êtes client, exécuter le contrat.",
    ],
  },
  {
    title: "Base légale",
    body: [
      "Consentement (formulaires, cookies de mesure d'audience) et exécution du contrat ou mesures précontractuelles pour les demandes commerciales.",
    ],
  },
  {
    title: "Durée de conservation",
    body: [
      "Demandes de contact : 3 ans à compter du dernier échange. Données clients : durée de la relation contractuelle, puis archivage légal. Mesure d'audience : 13 mois maximum.",
    ],
  },
  {
    title: "Destinataires",
    body: [
      "Les données ne sont ni vendues ni cédées. Elles peuvent être traitées par nos prestataires techniques (hébergement, envoi d'emails et de SMS), agissant comme sous-traitants.",
    ],
  },
  {
    title: "Vos droits",
    body: [
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Pour les exercer, écrivez à contact.rollsy@gmail.com. Vous pouvez également introduire une réclamation auprès de la CNIL.",
    ],
  },
];

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1
        className="mb-2 font-display text-3xl font-extrabold sm:text-4xl"
        style={{
          color: "#FF3DA6",
          WebkitTextStroke: "2px #1a1a1a",
          paintOrder: "stroke fill",
          filter: "drop-shadow(4px 4px 0 #1a1a1a)",
        }}
      >
        Politique de confidentialité 🔒
      </h1>
      <p className="mb-8 font-bold text-ink/70">Dernière mise à jour : juillet 2026</p>

      {SECTIONS.map((s) => (
        <section key={s.title} className="ink-border-thick mb-6 rounded-3xl bg-white p-6 shadow-pop-pink">
          <h2 className="mb-3 font-display text-xl font-extrabold">{s.title}</h2>
          <div className="space-y-2 text-sm font-semibold leading-relaxed text-ink/80">
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/"
          className="ink-border-thick inline-flex min-h-[52px] items-center rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
        >
          Accueil 🏠
        </Link>
        <Link
          to="/cgv"
          className="ink-border inline-flex min-h-[52px] items-center rounded-full bg-white px-6 font-extrabold uppercase"
        >
          CGV 📄
        </Link>
      </div>
    </main>
  );
}
