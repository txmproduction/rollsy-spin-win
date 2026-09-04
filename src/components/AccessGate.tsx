import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getMyAccessState } from "@/lib/rollsy.functions";

export const WHATSAPP_NUMBER = "33695449963";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

type AccessState = Awaited<ReturnType<typeof getMyAccessState>>;

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-ink/20 bg-yellow/90 px-3 py-1.5 text-center text-xs">
      <span className="font-medium">
        Essai gratuit : {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant
        {daysLeft > 1 ? "s" : ""}
      </span>
      <a
        href={whatsappLink("Je souhaite passer à la version complète")}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-white px-2.5 py-0.5 font-semibold hover:bg-white/70"
      >
        Passer à la version complète →
      </a>
    </div>
  );
}

/** Recalcule l'accès côté serveur à chaque montage (jamais depuis le localStorage). */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AccessState | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const s = await getMyAccessState();
        if (!alive) return;
        setState(s);
        if (s?.blocked) navigate({ to: "/acces-suspendu", replace: true });
      } catch {
        /* pas de session ou pas de commerce : les pages gèrent déjà ce cas */
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (state?.blocked) return null;

  return (
    <>
      {checked && state?.effectiveStatus === "trial" && (
        <TrialBanner daysLeft={state.daysLeft ?? 0} />
      )}
      {children}
    </>
  );
}
