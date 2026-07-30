import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchPublicSettings } from "@/lib/rollsy.functions";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Rollsy" },
      {
        name: "description",
        content:
          "Comment vos données personnelles sont collectées, utilisées et protégées dans le programme de fidélité.",
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
  loader: async () => fetchPublicSettings(),
  errorComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="font-bold">Impossible de charger la politique de confidentialité.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="font-bold">Page introuvable.</p>
    </main>
  ),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ink-border-thick mb-6 rounded-3xl bg-white p-6 shadow-pop-pink">
      <h2 className="mb-3 font-display text-xl font-extrabold">{title}</h2>
      <div className="space-y-2 text-sm font-semibold leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  const s = Route.useLoaderData();
  const business = s.business_name || "le commerce";
  const address = s.business_address || "";
  const email = s.business_email || "";

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
      <p className="mb-8 font-bold text-ink/70">Programme de fidélité — {business}</p>

      <Section title="1. Responsable du traitement">
        <p>
          {business}
          {address ? `, ${address}` : ""}, est responsable du traitement des données collectées
          dans le cadre de ce jeu.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>
          Nom, numéro de téléphone, et éventuellement email, collectés lors de votre participation
          au jeu.
        </p>
      </Section>

      <Section title="3. Finalités">
        <ul className="list-disc space-y-1 pl-5">
          <li>Gestion de votre participation au jeu et attribution des lots gagnés</li>
          <li>
            Si vous y avez consenti : envoi par SMS de nos offres et promotions commerciales
          </li>
        </ul>
      </Section>

      <Section title="4. Base légale">
        <ul className="list-disc space-y-1 pl-5">
          <li>Gestion du jeu : exécution du service demandé</li>
          <li>
            Prospection commerciale : votre consentement exprès, recueilli via la case dédiée
          </li>
        </ul>
      </Section>

      <Section title="5. Durée de conservation">
        <p>
          Vos données sont conservées 3 ans à compter de votre dernière interaction avec {business}{" "}
          (participation, réponse à un SMS, etc.), sauf demande de suppression anticipée de votre
          part.
        </p>
      </Section>

      <Section title="6. Destinataires">
        <p>
          Vos données sont accessibles uniquement par {business} et son prestataire technique (
          {s.agency_name || "TXM Production"}
          {s.agency_address ? `, ${s.agency_address}` : ""}
          {s.agency_legal ? ` — ${s.agency_legal}` : ""}), qui n'intervient qu'en tant que
          sous-traitant pour l'hébergement et le fonctionnement de l'outil.
        </p>
      </Section>

      <Section title="7. Vos droits">
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement,
          d'opposition et de portabilité de vos données. Vous pouvez exercer ces droits à tout
          moment en contactant : {email || "le commerce"}.
        </p>
        <p>
          Vous pouvez également vous désinscrire des SMS promotionnels à tout moment en répondant
          STOP au SMS reçu.
        </p>
        <p>
          Vous disposez enfin d'un droit de réclamation auprès de la CNIL (
          <a
            className="underline"
            href="https://www.cnil.fr"
            target="_blank"
            rel="noreferrer noopener"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </Section>

      <Link
        to="/"
        className="ink-border-thick inline-flex min-h-[52px] items-center rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
      >
        Retour à l'accueil 🏠
      </Link>
    </main>
  );
}
