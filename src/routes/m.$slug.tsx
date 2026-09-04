import { createFileRoute, notFound } from "@tanstack/react-router";
import PlayerLanding from "@/components/PlayerLanding";
import { fetchMerchant } from "@/lib/rollsy.functions";

export const Route = createFileRoute("/m/$slug")({
  head: ({ loaderData }) => {
    const name = (loaderData as { companyName?: string } | undefined)?.companyName ?? "Rollsy";
    return {
      meta: [
        { title: `${name} — Tentez votre chance 🎉 | Rollsy` },
        {
          name: "description",
          content: `Faites l'action demandée par ${name}, tournez la roue et gagnez une récompense immédiate.`,
        },
        { property: "og:title", content: `${name} — Tentez votre chance` },
        {
          property: "og:description",
          content: `Tournez la roue de ${name} et gagnez une récompense immédiate.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  loader: async ({ params }) => {
    const merchant = await fetchMerchant({ data: { slug: params.slug } });
    if (!merchant) throw notFound();
    return { ...merchant, isDefault: false };
  },
  errorComponent: () => (
    <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">
      Impossible de charger la page. Réessayez.
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">Commerce introuvable.</main>
  ),
  component: () => <PlayerLanding merchant={Route.useLoaderData()} />,
});
