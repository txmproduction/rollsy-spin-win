const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-ink/10 bg-muted px-4 py-2 text-center text-xs text-ink/70">
        Le paiement en ligne n'est pas encore activé.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-ink/10 bg-muted px-4 py-2 text-center text-xs text-ink/70">
        Paiements en mode test dans l'aperçu.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          En savoir plus
        </a>
      </div>
    );
  }
  return null;
}
