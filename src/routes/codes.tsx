import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessGate } from "@/components/AccessGate";
import { getMerchantAdminData, markSpinCodeUsed } from "@/lib/rollsy.functions";

type AdminData = Awaited<ReturnType<typeof getMerchantAdminData>>;

const STATUS_LABEL: Record<string, string> = {
  valid: "Valide ✅",
  used: "Déjà utilisé ❌",
  expired: "Expiré ⏳",
};

const STATUS_CLASS: Record<string, string> = {
  valid: "bg-green text-white",
  used: "bg-orange/30 text-ink",
  expired: "bg-yellow/40 text-ink",
};

function fmtDate(v: string | null) {
  return v ? new Date(v).toLocaleString("fr-FR") : "—";
}

type CodeItem = {
  id: string;
  code: string;
  rewardName: string;
  clientName: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  used: boolean;
  status: "valid" | "used" | "expired";
  demo: boolean;
};

function demoRows(): CodeItem[] {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  return [
    {
      id: "demo-1",
      code: "TXM-DEMO1",
      rewardName: "Donut offert",
      clientName: "Camille Durand",
      createdAt: iso(now - 2 * 3600000),
      expiresAt: iso(now + 5 * 86400000),
      usedAt: null,
      used: false,
      status: "valid",
      demo: true,
    },
    {
      id: "demo-2",
      code: "TXM-DEMO2",
      rewardName: "Café offert",
      clientName: "Yanis Bernard",
      createdAt: iso(now - 26 * 3600000),
      expiresAt: iso(now + 4 * 86400000),
      usedAt: null,
      used: false,
      status: "valid",
      demo: true,
    },
    {
      id: "demo-3",
      code: "TXM-DEMO3",
      rewardName: "Remise de 10 %",
      clientName: "Sofia Martin",
      createdAt: iso(now - 3 * 86400000),
      expiresAt: iso(now + 4 * 86400000),
      usedAt: iso(now - 2 * 86400000),
      used: true,
      status: "used",
      demo: true,
    },
    {
      id: "demo-4",
      code: "TXM-DEMO4",
      rewardName: "Bubble tea",
      clientName: "Lucas Petit",
      createdAt: iso(now - 10 * 86400000),
      expiresAt: iso(now - 3 * 86400000),
      usedAt: null,
      used: false,
      status: "expired",
      demo: true,
    },
    {
      id: "demo-5",
      code: "TXM-DEMO5",
      rewardName: "Porte-clef",
      clientName: "Inès Robert",
      createdAt: iso(now - 5 * 3600000),
      expiresAt: iso(now + 6 * 86400000),
      usedAt: null,
      used: false,
      status: "valid",
      demo: true,
    },
  ];
}

export const Route = createFileRoute("/codes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Historique des codes — Rollsy" },
      {
        name: "description",
        content: "Retrouvez toutes les participations et codes de récompense de votre roue Rollsy.",
      },
      { property: "og:title", content: "Historique des codes — Rollsy" },
      {
        property: "og:description",
        content: "Codes en attente, utilisés ou expirés de vos participants Rollsy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodesGated,
});

function CodesGated() {
  return (
    <AccessGate>
      <CodesPage />
    </AccessGate>
  );
}

function CodesPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "valid" | "used" | "expired">("all");
  const [search, setSearch] = useState("");
  const [showDemo, setShowDemo] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await withTimeout(getMerchantAdminData()));
    } catch {
      /* réseau indisponible : on réessaiera au retour au premier plan */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAppResume(() => {
    void load();
  });

  const realItems = useMemo<CodeItem[]>(() => {
    const now = Date.now();
    const rewards = data?.rewards ?? [];
    const clients = data?.clients ?? [];
    return (data?.spins ?? [])
      .filter((s) => s.result === "win" && s.code)
      .map((s) => {
        const expiresAt =
          (s as { code_expires_at?: string | null }).code_expires_at ??
          new Date(new Date(s.created_at).getTime() + 7 * 86400000).toISOString();
        const used = s.code_used === true;
        const status: "valid" | "used" | "expired" = used
          ? "used"
          : new Date(expiresAt).getTime() < now
            ? "expired"
            : "valid";
        return {
          id: s.id,
          code: s.code as string,
          rewardName: rewards.find((r) => r.id === s.reward_id)?.name ?? "Lot",
          clientName:
            clients.find((c) => c.id === s.client_id)?.name?.trim() || "Participant",
          createdAt: s.created_at,
          expiresAt,
          usedAt: (s as { code_used_at?: string | null }).code_used_at ?? null,
          used,
          status,
          demo: false,
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data]);

  const items = useMemo(
    () => (showDemo ? [...demoRows(), ...realItems] : realItems),
    [showDemo, realItems],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      valid: items.filter((c) => c.status === "valid").length,
      used: items.filter((c) => c.status === "used").length,
      expired: items.filter((c) => c.status === "expired").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return items
      .filter((c) => filter === "all" || c.status === filter)
      .filter(
        (c) =>
          !q ||
          c.code.includes(q) ||
          c.clientName.toUpperCase().includes(q) ||
          c.rewardName.toUpperCase().includes(q),
      );
  }, [items, filter, search]);

  async function toggle(item: CodeItem) {
    if (item.demo) return;
    setBusy(true);
    try {
      await markSpinCodeUsed({ data: { spinId: item.id, used: !item.used } });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/admin"
        className="ink-border mb-6 inline-flex min-h-[44px] items-center rounded-full bg-white px-4 font-extrabold"
      >
        ← Retour à mon espace
      </Link>
      <h1 className="mb-2 font-display text-3xl font-extrabold">Tous les codes 🎫</h1>
      <p className="mb-6 font-bold text-ink/70">
        Historique complet des participations gagnantes, avec leur statut.
      </p>

      <section className="ink-border-thick mb-6 rounded-3xl bg-white p-6 shadow-pop-pink">
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "Tous"],
              ["valid", "En attente"],
              ["used", "Utilisés"],
              ["expired", "Expirés"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`ink-border min-h-[44px] rounded-full px-4 text-sm font-extrabold ${
                filter === value ? "bg-ink text-white" : "bg-white"
              }`}
            >
              {label} ({counts[value]})
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un code, un client, un lot…"
          className="ink-border mb-4 min-h-[52px] w-full rounded-full px-5 font-bold"
        />

        <label className="mb-4 flex items-center gap-3 text-sm font-extrabold">
          <input
            type="checkbox"
            checked={showDemo}
            onChange={(e) => setShowDemo(e.target.checked)}
            className="h-5 w-5"
          />
          Afficher des participations d'exemple (démo)
        </label>

        {loading ? (
          <p className="text-sm font-bold text-ink/70">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm font-bold text-ink/70">Aucun code dans cette catégorie.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((sp) => (
              <div
                key={sp.id}
                className="ink-border flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold tracking-widest">{sp.code}</p>
                    <span
                      className={`ink-border rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        STATUS_CLASS[sp.status] ?? "bg-white"
                      }`}
                    >
                      {STATUS_LABEL[sp.status]}
                    </span>
                    {sp.demo && (
                      <span className="ink-border rounded-full bg-yellow/40 px-2 py-0.5 text-[10px] font-extrabold">
                        Exemple
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-ink/60">
                    {sp.clientName} · {sp.rewardName} · gagné le {fmtDate(sp.createdAt)}
                    {sp.used
                      ? ` · utilisé le ${fmtDate(sp.usedAt)}`
                      : ` · expire le ${fmtDate(sp.expiresAt)}`}
                  </p>
                </div>
                <button
                  onClick={() => toggle(sp)}
                  disabled={busy || sp.demo}
                  className={`ink-border min-h-[44px] rounded-full px-4 text-sm font-extrabold uppercase disabled:opacity-50 ${
                    sp.used ? "bg-white text-ink/60" : "bg-green text-white"
                  }`}
                >
                  {sp.used ? "Annuler" : "Valider ✓"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
