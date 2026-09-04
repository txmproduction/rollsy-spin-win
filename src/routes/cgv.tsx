import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions générales de vente — Rollsy" },
      {
        name: "description",
        content:
          "Offres, essai gratuit 14 jours, paiement, résiliation et obligations liées au service Rollsy.",
      },
      { property: "og:title", content: "Conditions générales de vente — Rollsy" },
      {
        property: "og:description",
        content: "Offres, essai gratuit, paiement, résiliation et obligations du client.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CgvPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Objet",
    body: [
      "Les présentes conditions régissent l'utilisation du site Rollsy et la fourniture du service de collecte d'avis Google par jeu de roue accessible via QR code, destiné à des professionnels.",
    ],
  },
  {
    title: "2. Offres et tarifs",
    body: [
      "Trois formules sont proposées : Starter (0 €), Pro (49 € HT par mois ou 490 € HT par an) et Premium (89 € HT par mois ou 890 € HT par an). Les prix sont indiqués hors taxes ; la TVA applicable s'ajoute selon la réglementation en vigueur.",
    ],
  },
  {
    title: "3. Essai gratuit",
    body: [
      "Essai gratuit 14 jours, sans carte bancaire. Aucun prélèvement n'est effectué pendant la période d'essai et l'essai ne se transforme pas automatiquement en abonnement payant : la souscription nécessite une action explicite du client.",
    ],
  },
  {
    title: "4. Modalités de paiement",
    body: [
      "Les abonnements sont réglés d'avance, mensuellement ou annuellement, par les moyens de paiement proposés lors de la souscription. Aucun paiement n'est réalisé directement sur ce site vitrine.",
    ],
  },
  {
    title: "5. Droit de rétractation",
    body: [
      "Le service s'adresse à des professionnels agissant dans le cadre de leur activité. Pour les clients éligibles au droit de rétractation, celui-ci ne s'applique plus dès lors que la prestation de service a commencé avec l'accord exprès du client avant l'expiration du délai légal.",
    ],
  },
  {
    title: "6. Durée et résiliation",
    body: [
      "Les abonnements sont sans engagement de durée et résiliables à tout moment, avec effet à la fin de la période en cours. La résiliation s'effectue depuis l'espace client ou par simple demande écrite à contact.rollsy@gmail.com.",
    ],
  },
  {
    title: "7. Obligations du client",
    body: [
      "Le client s'engage à respecter les règles de la plateforme Google relatives aux avis. Il lui est strictement interdit de publier ou de faire publier de faux avis, de conditionner une contrepartie à la note ou au contenu d'un avis, ou de filtrer les clients selon leur niveau de satisfaction. Le gain au jeu est aléatoire et indépendant de l'avis laissé.",
    ],
  },
  {
    title: "8. Responsabilité",
    body: [
      "Rollsy fournit un outil de collecte et ne garantit aucun résultat chiffré en nombre d'avis, en note moyenne ou en chiffre d'affaires. Les performances dépendent notamment du flux de clientèle, de l'emplacement des supports et de la qualité du service rendu par le client.",
    ],
  },
  {
    title: "9. Propriété intellectuelle",
    body: [
      "Le client conserve la propriété de ses contenus et de son fichier clients, exportable à tout moment. Rollsy conserve la propriété de sa plateforme et de ses éléments logiciels.",
    ],
  },
  {
    title: "10. Litiges",
    body: [
      "Les présentes conditions sont soumises au droit français. À défaut de résolution amiable, tout litige relève de la compétence des tribunaux français compétents.",
    ],
  },
];

function CgvPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1
        className="mb-8 font-display text-3xl font-extrabold sm:text-4xl"
        style={{
          color: "#FF3DA6",
          WebkitTextStroke: "2px #1a1a1a",
          paintOrder: "stroke fill",
          filter: "drop-shadow(4px 4px 0 #1a1a1a)",
        }}
      >
        Conditions générales de vente 📄
      </h1>

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
          to="/confidentialite"
          className="ink-border inline-flex min-h-[52px] items-center rounded-full bg-white px-6 font-extrabold uppercase"
        >
          Confidentialité 🔒
        </Link>
      </div>
    </main>
  );
}
