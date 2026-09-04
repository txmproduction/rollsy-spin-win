import { createFileRoute, notFound } from "@tanstack/react-router";
import PlayerLanding from "@/components/PlayerLanding";
import { fetchMerchant } from "@/lib/rollsy.functions";
import { DEFAULT_SLUG } from "@/lib/player";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rollsy — Laissez un avis et tentez votre chance 🎉" },
      {
        name: "description",
        content:
          "Scannez, donnez votre avis, tournez la roue et gagnez une récompense immédiate chez votre commerçant.",
      },
      { property: "og:title", content: "Rollsy — Laissez un avis et tentez votre chance" },
      {
        property: "og:description",
        content: "Donnez votre avis, tournez la roue et gagnez une récompense immédiate.",
      },
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
      Impossible de charger la page. Réessayez.
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-20 text-center font-bold">Page introuvable.</main>
  ),
  component: Index,
});

function Index() {
  return <PlayerLanding merchant={Route.useLoaderData()} />;
}
