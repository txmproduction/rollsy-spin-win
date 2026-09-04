import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMerchantsForSuperAdmin, setMerchantAccess } from "@/lib/rollsy.functions";

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

  useEffect(() => {
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      await load();
      setBooting(false);
    })();
  }, [load, navigate]);

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

  if (booting) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
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
