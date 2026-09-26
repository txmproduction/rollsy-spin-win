import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ProShell, ProLocked, usePlan, inputCls, labelCls, btnPrimary } from "@/components/ProShell";
import { fetchCampaigns, fetchSegments, launchCampaign } from "@/lib/pro.functions";

export const Route = createFileRoute("/campagnes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Campagnes — Rollsy Pro" },
      { name: "description", content: "Envoyez des SMS et emails à vos segments de clients." },
      { property: "og:title", content: "Campagnes — Rollsy Pro" },
      { property: "og:description", content: "Campagnes SMS et email Rollsy Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CampaignsPage,
});

type Segment = Awaited<ReturnType<typeof fetchSegments>>[number];
type Campaign = Awaited<ReturnType<typeof fetchCampaigns>>[number];

const STATUS: Record<string, string> = { sent: "Envoyée", partial: "Partielle", failed: "Échec", empty: "Aucun destinataire" };

function CampaignsPage() {
  const { plan, loading } = usePlan();
  if (loading) return null;
  return (
    <ProShell title="Campagnes" subtitle="Seuls les clients ayant accepté les communications marketing reçoivent vos messages.">
      {plan?.plan === "pro" ? <Campaigns /> : <ProLocked />}
    </ProShell>
  );
}

function Campaigns() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [history, setHistory] = useState<Campaign[]>([]);
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [segmentId, setSegmentId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, h] = await Promise.all([fetchSegments(), fetchCampaigns()]);
    setSegments(s);
    setHistory(h);
  }, []);
  useEffect(() => void load(), [load]);

  async function send() {
    if (!confirm("Envoyer cette campagne maintenant ?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await launchCampaign({
        data: { channel, segmentId: segmentId || null, subject: channel === "email" ? subject : null, body },
      });
      if ("error" in r) setMsg(r.error);
      else {
        setMsg(`${r.sent} message${r.sent > 1 ? "s" : ""} envoyé${r.sent > 1 ? "s" : ""} sur ${r.recipients}.`);
        setBody("");
        setSubject("");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const canSend = body.trim() && (channel === "sms" || subject.trim()) && !busy;

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">Nouvelle campagne</h2>
        <div className="flex gap-6 text-sm">
          {(["sms", "email"] as const).map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input type="radio" checked={channel === c} onChange={() => setChannel(c)} />
              {c === "sms" ? "SMS" : "Email"}
            </label>
          ))}
        </div>
        <div>
          <label className={labelCls}>Destinataires</label>
          <select className={inputCls} value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
            <option value="">Tous les clients consentants</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {channel === "email" && (
          <div>
            <label className={labelCls}>Objet</label>
            <input className={inputCls} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
          </div>
        )}
        <div>
          <label className={labelCls}>Message</label>
          <textarea
            rows={channel === "sms" ? 4 : 8}
            className={inputCls}
            value={body}
            maxLength={channel === "sms" ? 300 : 2000}
            onChange={(e) => setBody(e.target.value)}
          />
          {channel === "sms" && (
            <p className="mt-1 text-xs text-ink/40">{body.length}/300 — la mention « STOP » est ajoutée automatiquement.</p>
          )}
        </div>
        <button onClick={() => void send()} disabled={!canSend} className={btnPrimary}>
          {busy ? "Envoi…" : "Envoyer"}
        </button>
        {msg && <p className="text-sm text-ink/60">{msg}</p>}
      </section>

      <section>
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink/50">Historique</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink/50">Aucune campagne envoyée.</p>
        ) : (
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {history.map((c) => (
              <li key={c.id} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-bold">{c.subject ?? (c.channel === "sms" ? "SMS" : "Email")}</p>
                  <p className="shrink-0 text-xs tabular-nums text-ink/50">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {c.channel === "sms" ? "SMS" : "Email"} · {c.segmentName} · {c.sent}/{c.recipients} destinataires · {STATUS[c.status] ?? c.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
