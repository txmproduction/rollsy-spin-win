import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyPlan } from "@/lib/pro.functions";
import { withTimeout, useAppResume } from "@/lib/resilience";

export type PlanState = Awaited<ReturnType<typeof fetchMyPlan>>;

/** Charge la session + le plan. Redirige vers /admin sans session. */
export function usePlan() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const { data } = await withTimeout(supabase.auth.getSession());
      if (!data.session) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      setPlan(await withTimeout(fetchMyPlan()));
    } catch {
      /* réseau */
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    void load();
  }, [load]);
  useAppResume(() => void load());
  return { plan, loading, reload: load };
}

const NAV = [
  { to: "/crm", label: "Clients" },
  { to: "/campagnes", label: "Campagnes" },
  { to: "/pro", label: "Abonnement" },
] as const;

export function ProShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-ink">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
        <Link to="/admin" className="text-sm text-ink/60 hover:text-ink">
          ← Espace commerçant
        </Link>
        <nav className="flex gap-5 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-ink/50 hover:text-ink"
              activeProps={{ className: "font-bold text-ink" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <header className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-ink/60">{subtitle}</p>}
      </header>
      {children}
    </main>
  );
}

export function ProLocked() {
  return (
    <div className="border-t border-ink/10 pt-8">
      <p className="text-lg font-bold">Fonction réservée à Rollsy Pro</p>
      <p className="mt-2 max-w-md text-ink/60">
        Le fichier clients avancé et les campagnes SMS / email sont inclus dans l'offre Pro.
      </p>
      <Link
        to="/pro"
        className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-background"
      >
        Passer en Pro
      </Link>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-ink/15 bg-background px-3 py-2 text-sm outline-none focus:border-ink/50";
export const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-ink/50";
export const btnPrimary =
  "rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-background disabled:opacity-40";
export const btnGhost =
  "rounded-full border border-ink/20 px-4 py-2 text-sm font-bold hover:border-ink/50 disabled:opacity-40";
