import { createFileRoute, notFound } from "@tanstack/react-router";
import PlayerWheel from "@/components/PlayerWheel";
import { fetchMerchant } from "@/lib/rollsy.functions";

export const Route = createFileRoute("/m/$slug/roue")({
  head: ({ loaderData }) => {
    const name = loaderData?.companyName ?? "Rollsy";
    return {
      meta: [
        { title: `Tournez la roue 🎰 — ${name}` },
        { name: "description", content: `Tournez la roue de ${name} et gagnez une récompense.` },
        { property: "og:title", content: `Tournez la roue — ${name}` },
        { property: "og:description", content: `Tournez la roue de ${name} et gagnez une récompense.` },
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
      Impossible de charger la roue. Réessayez.
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">Commerce introuvable.</main>
  ),
  component: () => <PlayerWheel merchant={Route.useLoaderData()} />,
});
