import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ProShell,
  ProLocked,
  usePlan,
  inputCls,
  labelCls,
  btnPrimary,
  btnGhost,
} from "@/components/ProShell";
import { fetchCrmClients, fetchSegments, removeSegment, saveSegment } from "@/lib/pro.functions";

export const Route = createFileRoute("/crm")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clients — Rollsy Pro" },
      { name: "description", content: "Fichier clients, segments et export CSV de votre commerce." },
      { property: "og:title", content: "Clients — Rollsy Pro" },
      { property: "og:description", content: "Fichier clients avancé Rollsy Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CrmPage,
});

type Filters = {
  consent: "any" | "yes" | "no";
  signedFrom?: string | null;
  signedTo?: string | null;
  minVisits?: number | null;
  maxVisits?: number | null;
  returnedWithinDays?: number | null;
  notReturnedDays?: number | null;
  search?: string | null;
};
type Result = Awaited<ReturnType<typeof fetchCrmClients>>;
type Segment = Awaited<ReturnType<typeof fetchSegments>>[number];

const EMPTY: Filters = { consent: "any" };
const num = (v: string) => (v === "" ? null : Math.max(0, parseInt(v, 10) || 0));
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function CrmPage() {
  const { plan, loading } = usePlan();
  if (loading) return null;
  return (
    <ProShell title="Clients" subtitle="Tous les joueurs de votre roue, filtrables et exportables.">
      {plan?.plan === "pro" ? <Crm /> : <ProLocked />}
    </ProShell>
  );
}

function Crm() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [result, setResult] = useState<Result | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segName, setSegName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const run = useCallback(async (f: Filters) => {
    try {
      setResult(await fetchCrmClients({ data: f }));
    } catch {
      setMsg("Chargement impossible.");
    }
  }, []);
  const loadSegments = useCallback(async () => setSegments(await fetchSegments()), []);

  useEffect(() => {
    void run(EMPTY);
    void loadSegments();
  }, [run, loadSegments]);

  useEffect(() => {
    const t = setTimeout(() => void run(filters), 250);
    return () => clearTimeout(t);
  }, [filters, run]);

  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  async function onSave() {
    if (!segName.trim()) return;
    await saveSegment({ data: { name: segName.trim(), filters } });
    setSegName("");
    setMsg("Segment enregistré.");
    await loadSegments();
  }

  function exportCsv() {
    const rows = result?.rows ?? [];
    const head = ["Prénom", "Nom", "Téléphone", "Email", "Inscription", "Passages", "Dernier passage", "Dernier gain", "Consentement marketing"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [r.firstName, r.lastName, r.phone ?? "", r.email ?? "", fmt(r.createdAt), r.visits, fmt(r.lastVisit), r.lastWin ?? "", r.marketingConsent ? "oui" : "non"].map(esc).join(";"),
    );
    const blob = new Blob(["\ufeff" + [head.map(esc).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-10">
      {segments.length > 0 && (
        <section>
          <p className={labelCls}>Segments enregistrés</p>
          <div className="flex flex-wrap gap-2">
            {segments.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-ink/15 py-1 pl-3 pr-1 text-sm">
                <button onClick={() => setFilters(s.filters as Filters)} className="hover:underline">
                  {s.name}
                </button>
                <button
                  aria-label={`Supprimer ${s.name}`}
                  onClick={async () => {
                    await removeSegment({ data: { id: s.id } });
                    await loadSegments();
                  }}
                  className="rounded-full px-2 text-ink/40 hover:text-ink"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Recherche</label>
          <input className={inputCls} placeholder="Nom, téléphone, email" value={filters.search ?? ""} onChange={(e) => set({ search: e.target.value || null })} />
        </div>
        <div>
          <label className={labelCls}>Consentement marketing</label>
          <select className={inputCls} value={filters.consent} onChange={(e) => set({ consent: e.target.value as Filters["consent"] })}>
            <option value="any">Tous</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Passages min</label>
            <input type="number" min={0} className={inputCls} value={filters.minVisits ?? ""} onChange={(e) => set({ minVisits: num(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>max</label>
            <input type="number" min={0} className={inputCls} value={filters.maxVisits ?? ""} onChange={(e) => set({ maxVisits: num(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Inscrit depuis le</label>
          <input type="date" className={inputCls} value={filters.signedFrom ?? ""} onChange={(e) => set({ signedFrom: e.target.value || null })} />
        </div>
        <div>
          <label className={labelCls}>Inscrit jusqu'au</label>
          <input type="date" className={inputCls} value={filters.signedTo ?? ""} onChange={(e) => set({ signedTo: e.target.value || null })} />
        </div>
        <div>
          <label className={labelCls}>Revenu depuis (jours)</label>
          <input type="number" min={1} className={inputCls} placeholder="ex. 7" value={filters.returnedWithinDays ?? ""} onChange={(e) => set({ returnedWithinDays: num(e.target.value) || null })} />
        </div>
        <div>
          <label className={labelCls}>Pas revenu depuis (jours)</label>
          <input type="number" min={1} className={inputCls} placeholder="ex. 30" value={filters.notReturnedDays ?? ""} onChange={(e) => set({ notReturnedDays: num(e.target.value) || null })} />
        </div>
      </section>

      <section className="flex flex-wrap items-end justify-between gap-4 border-y border-ink/10 py-4">
        <p className="text-sm">
          <span className="font-bold">{result?.rows.length ?? "…"}</span>
          <span className="text-ink/50"> sur {result?.total ?? "…"} clients</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFilters(EMPTY)} className="text-sm text-ink/50 hover:text-ink">
            Réinitialiser
          </button>
          <input className={`${inputCls} w-44`} placeholder="Nom du segment" value={segName} onChange={(e) => setSegName(e.target.value)} />
          <button onClick={() => void onSave()} disabled={!segName.trim()} className={btnGhost}>
            Enregistrer le segment
          </button>
          <button onClick={exportCsv} disabled={!result?.rows.length} className={btnPrimary}>
            Export CSV
          </button>
        </div>
      </section>
      {msg && <p className="text-sm text-ink/60">{msg}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink/40">
            <tr>
              {["Prénom", "Nom", "Téléphone", "Email", "Inscription", "Passages", "Dernier gain", "Marketing"].map((h) => (
                <th key={h} className="pb-3 pr-4 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {(result?.rows ?? []).map((r) => (
              <tr key={r.id}>
                <td className="py-3 pr-4 font-bold">{r.firstName || "—"}</td>
                <td className="py-3 pr-4">{r.lastName || "—"}</td>
                <td className="py-3 pr-4 tabular-nums">{r.phone ?? "—"}</td>
                <td className="py-3 pr-4 text-ink/70">{r.email ?? "—"}</td>
                <td className="py-3 pr-4 tabular-nums text-ink/70">{fmt(r.createdAt)}</td>
                <td className="py-3 pr-4 tabular-nums">{r.visits}</td>
                <td className="py-3 pr-4 text-ink/70">{r.lastWin ?? "—"}</td>
                <td className="py-3 pr-4">{r.marketingConsent ? "Oui" : <span className="text-ink/40">Non</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result && result.rows.length === 0 && <p className="py-8 text-sm text-ink/50">Aucun client ne correspond.</p>}
      </div>
    </div>
  );
}
