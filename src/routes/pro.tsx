import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { ProShell, usePlan, btnPrimary, btnGhost } from "@/components/ProShell";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { createBillingPortal, createProCheckout } from "@/lib/pro.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/pro")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { checkout?: string } => ({
    checkout: typeof s.checkout === "string" ? s.checkout : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Rollsy Pro — Abonnement" },
      { name: "description", content: "Passez à Rollsy Pro : fichier clients avancé et campagnes SMS / email." },
      { property: "og:title", content: "Rollsy Pro — Abonnement" },
      { property: "og:description", content: "Fichier clients avancé et campagnes marketing pour commerçants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProPage,
});

const FEATURES = [
  ["Fichier clients complet", "Passages, dernier gain, consentement, filtres et export CSV."],
  ["Segments enregistrés", "Par exemple : clients consentants pas revenus depuis 30 jours."],
  ["Campagnes SMS et email", "Envoyées à vos segments, avec historique des envois."],
];

function ProPage() {
  const { plan, loading } = usePlan();
  const { checkout } = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  if (loading) return null;
  const isPro = plan?.plan === "pro";
  const sub = plan?.subscription;

  async function fetchClientSecret() {
    const r = await createProCheckout({
      data: {
        returnUrl: `${window.location.origin}/pro?checkout=done`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  }

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const r = await createBillingPortal({
        data: { returnUrl: `${window.location.origin}/pro`, environment: getStripeEnvironment() },
      });
      if ("error" in r) throw new Error(r.error);
      window.open(r.url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ouverture impossible.");
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <>
      <PaymentTestModeBanner />
      <ProShell
        title={isPro ? "Rollsy Pro" : "Passer en Pro"}
        subtitle={
          isPro
            ? "Votre abonnement est actif."
            : "Tout ce que vous avez déjà, plus les outils pour faire revenir vos clients."
        }
      >
        {checkout === "done" && !isPro && (
          <p className="mb-8 text-sm text-ink/60">
            Paiement reçu. L'activation prend quelques secondes — rechargez la page si besoin.
          </p>
        )}

        <div className="grid gap-12 md:grid-cols-[1fr_260px]">
          <dl className="divide-y divide-ink/10 border-y border-ink/10">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="py-5">
                <dt className="font-bold">{t}</dt>
                <dd className="mt-1 text-sm text-ink/60">{d}</dd>
              </div>
            ))}
          </dl>

          <aside>
            <p className="font-display text-4xl font-bold">49 €</p>
            <p className="text-sm text-ink/60">HT par mois, sans engagement</p>

            {isPro ? (
              <div className="mt-6 space-y-3 text-sm">
                {sub?.currentPeriodEnd && (
                  <p className="text-ink/60">
                    {sub.cancelAtPeriodEnd || sub.status === "canceled" ? "Se termine le " : "Renouvellement le "}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
                  </p>
                )}
                {sub ? (
                  <button onClick={() => void openPortal()} disabled={portalBusy} className={btnGhost}>
                    Gérer ma facturation
                  </button>
                ) : (
                  <p className="text-ink/60">Offre activée par l'équipe Rollsy.</p>
                )}
              </div>
            ) : (
              !open && (
                <button onClick={() => setOpen(true)} className={`${btnPrimary} mt-6 w-full`}>
                  S'abonner
                </button>
              )
            )}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </aside>
        </div>

        {open && !isPro && (
          <div className="mt-12 border-t border-ink/10 pt-8">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </ProShell>
    </>
  );
}
