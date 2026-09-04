import { createFileRoute } from "@tanstack/react-router";
import { whatsappLink } from "@/components/AccessGate";

export const Route = createFileRoute("/acces-suspendu")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accès suspendu — Rollsy" },
      {
        name: "description",
        content: "Votre essai gratuit Rollsy est terminé. Vos données clients sont conservées.",
      },
      { property: "og:title", content: "Accès suspendu — Rollsy" },
      {
        property: "og:description",
        content: "Votre essai gratuit Rollsy est terminé. Contactez-nous pour réactiver l'accès.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuspendedPage,
});

function SuspendedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <div className="ink-border-thick rounded-3xl bg-white p-8 shadow-pop-pink">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="mb-4 font-display text-2xl font-extrabold">Oups !</h1>
        <p className="mb-6 font-bold text-ink/80">
          Si vous voyez cet écran, c'est que votre essai gratuit est terminé. Mais ne vous inquiétez
          pas, toutes vos données clients sont conservées si vous passez à la version Pro ou
          Premium.
        </p>
        <a
          href={whatsappLink("Je n'ai plus accès à mon compte")}
          target="_blank"
          rel="noreferrer"
          className="ink-border inline-block rounded-full bg-yellow px-6 py-3 font-display text-lg font-extrabold shadow-pop-pink"
        >
          💬 Nous écrire sur WhatsApp
        </a>
      </div>
    </main>
  );
}
