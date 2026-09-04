import { createFileRoute, notFound } from "@tanstack/react-router";
import PlayerWheel from "@/components/PlayerWheel";
import { fetchMerchant } from "@/lib/rollsy.functions";
import { DEFAULT_SLUG } from "@/lib/player";

export const Route = createFileRoute("/roue")({
  head: () => ({
    meta: [
      { title: "Tournez la roue 🎰 — Rollsy" },
      { name: "description", content: "Tournez la roue Rollsy et gagnez une récompense immédiate." },
      { property: "og:title", content: "Tournez la roue — Rollsy" },
      { property: "og:description", content: "Tournez la roue et gagnez une récompense immédiate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    const merchant = await fetchMerchant({ data: { slug: DEFAULT_SLUG } });
    if (!merchant) throw notFound();
    return { ...merchant, isDefault: true };
  },
  errorComponent: () => (
    <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">
      Impossible de charger la roue. Réessayez.
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">Page introuvable.</main>
  ),
  component: () => <PlayerWheel merchant={Route.useLoaderData()} />,
});
