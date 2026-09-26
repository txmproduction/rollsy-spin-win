import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { withTimeout, useAppResume } from "@/lib/resilience";
import { supabase } from "@/integrations/supabase/client";
import { listMerchantsForSuperAdmin, setMerchantAccess } from "@/lib/rollsy.functions";
import { setMerchantPlan } from "@/lib/pro.functions";

export const Route = createFileRoute("/super-admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Super admin — Rollsy" },
      { name: "description", content: "Pilotage des comptes commerçants et de leurs accès Rollsy." },
      { property: "og:title", content: "Super admin — Rollsy" },
      { property: "og:description", content: "Pilotage des comptes commerçants Rollsy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminPage,
});

type Row = Awaited<ReturnType<typeof listMerchantsForSuperAdmin>>[number];

const STATUS_LABELS: Record<string, string> = {
  trial: "Essai gratuit",
  active: "Accès permanent",
  suspended: "Accès suspendu",
};

const SUB_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Actif",
  past_due: "Impayé",
  unpaid: "Impayé",
  canceled: "Annulé",
  ended: "Terminé",
  incomplete: "Incomplet",
};

function statusClass(status: string) {
  if (status === "active") return "bg-mint";
  if (status === "suspended") return "bg-pink/60";
  return "bg-yellow";
}

function SuperAdminPage() {
  const navigate = useNavigate();
  const [booting, setBooting] = useState(true);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listMerchantsForSuperAdmin();
      setRows(data);
    } catch {
      navigate({ to: "/", replace: true });
    }
  }, [navigate]);

  const boot = useCallback(async () => {
    try {
      const { data: s } = await withTimeout(supabase.auth.getSession());
      if (!s.session) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      await load();
    } catch {
      /* réseau indisponible */
    } finally {
      setBooting(false);
    }
  }, [load, navigate]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useAppResume(() => {
    void load();
  });

  async function changeStatus(row: Row, status: "trial" | "active" | "suspended") {
    setSavingId(row.id);
    setError(null);
    try {
      await setMerchantAccess({
        data: {
          merchantId: row.id,
          accessStatus: status,
          ...(status === "trial" ? { trialDays: 14 } : {}),
        },
      });
      await load();
    } catch {
      setError("Modification impossible.");
    } finally {
      setSavingId(null);
    }
  }

  async function changePlan(row: Row, plan: "free" | "pro") {
    setSavingId(row.id);
    setError(null);
    try {
      await setMerchantPlan({ data: { merchantId: row.id, plan } });
      await load();
    } catch {
      setError("Modification impossible.");
    } finally {
      setSavingId(null);
    }
  }

  if (booting) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else navigate({ to: "/admin" });
        }}
        aria-label="Revenir à la page précédente"
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink/70 hover:text-ink"
      >
        <span aria-hidden className="text-lg">←</span> Retour
      </button>
      <h1 className="mb-2 font-display text-3xl font-extrabold">Super admin 👑</h1>
      <p className="mb-8 font-bold text-ink/70">Tous les commerçants inscrits sur Rollsy.</p>

      {error && <p className="mb-4 font-extrabold text-pink">{error}</p>}

      <div className="space-y-4">
        {(rows ?? []).map((row) => (
          <section
            key={row.id}
            className="ink-border-thick rounded-3xl bg-white p-5 shadow-pop-pink"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-extrabold">{row.companyName}</h2>
                <p className="text-sm font-bold text-ink/60">{row.email}</p>
                <p className="text-sm font-bold text-ink/60">
                  {row.phone ? (
                    <a href={`tel:${row.phone.replace(/[^+\d]/g, "")}`} className="underline">
                      {row.phone}
                    </a>
                  ) : (
                    "Numéro non renseigné"
                  )}
                </p>
              </div>
              <span
                className={`ink-border rounded-full px-3 py-1 text-sm font-extrabold ${statusClass(row.accessStatus)}`}
              >
                {STATUS_LABELS[row.accessStatus] ?? row.accessStatus}
                {row.accessStatus === "trial" && ` — ${row.daysLeft ?? 0} j restants`}
              </span>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="ink-border rounded-2xl bg-cream px-3 py-2">
                <div className="font-display text-2xl font-extrabold">{row.participants}</div>
                <div className="text-xs font-bold text-ink/60">Participants</div>
              </div>
              <div className="ink-border rounded-2xl bg-cream px-3 py-2">
                <div className="font-display text-2xl font-extrabold">{row.wins}</div>
                <div className="text-xs font-bold text-ink/60">Gains distribués</div>
              </div>
              <div className="ink-border rounded-2xl bg-cream px-3 py-2">
                <div className="font-display text-lg font-extrabold">
                  {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                </div>
                <div className="text-xs font-bold text-ink/60">Création</div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-ink/10 py-3 text-sm">
              <span>
                <span className="text-ink/50">Plan </span>
                <span className="font-bold">{row.plan === "pro" ? "Pro" : "Free"}</span>
              </span>
              <span>
                <span className="text-ink/50">Abonnement </span>
                <span className="font-bold">{SUB_LABELS[row.subscriptionStatus ?? ""] ?? "Aucun"}</span>
              </span>
              <button
                disabled={savingId === row.id}
                onClick={() => void changePlan(row, row.plan === "pro" ? "free" : "pro")}
                className="ml-auto text-sm font-bold underline underline-offset-4 disabled:opacity-40"
              >
                {row.plan === "pro" ? "Repasser en Free" : "Passer en Pro"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["trial", "active", "suspended"] as const).map((s) => (
                <button
                  key={s}
                  disabled={savingId === row.id || row.accessStatus === s}
                  onClick={() => void changeStatus(row, s)}
                  className={`ink-border min-h-[40px] rounded-full px-4 text-sm font-extrabold disabled:opacity-40 ${statusClass(s)}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </section>
        ))}
        {rows && rows.length === 0 && (
          <p className="font-bold text-ink/60">Aucun commerçant pour le moment.</p>
        )}
      </div>
    </main>
  );
}
