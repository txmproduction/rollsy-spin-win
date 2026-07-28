import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/roue")({
  head: () => ({
    meta: [
      { title: "Tournez la roue 🎰 — Rollsy" },
      { name: "description", content: "Tournez la roue Rollsy et gagnez une récompense immédiate." },
    ],
  }),
  component: RouePage,
});

type Reward = {
  id: string;
  name: string;
  short_label: string;
  frequency: "day" | "week";
  quota: number;
  quota_morning: number | null;
  quota_afternoon: number | null;
};

type Segment = { rewardId: string | null; label: string; short: string; color: string; emoji: string };

const LOSE_SEGMENT: Segment = { rewardId: null, label: "Perdu", short: "Perdu", color: "#A855F7", emoji: "🔁" };
const COLORS = ["#FF3DA6", "#FFE600", "#00D26A", "#00B4FF", "#FF6B00"];
const EMOJIS = ["🍗", "🥤", "💸", "🎁"];

// Poids relatif de "Perdu" face aux lots encore disponibles — ajuste ce chiffre pour rendre le jeu
// plus ou moins généreux (plus haut = moins de gains). Pourra être déplacé dans `settings` plus tard.
const LOSE_WEIGHT = 5;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TXM-";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isMorning(): boolean {
  return new Date().getHours() < 13;
}

function startOfDayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

function fireConfetti() {
  const burst = (opts: confetti.Options) =>
    confetti({ particleCount: 90, spread: 75, colors: COLORS, ...opts });
  burst({ origin: { x: 0.2, y: 0.6 }, angle: 60 });
  burst({ origin: { x: 0.8, y: 0.6 }, angle: 120 });
  setTimeout(() => burst({ origin: { x: 0.5, y: 0.3 }, particleCount: 160, spread: 110 }), 250);
}

function RouePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactSaved, setContactSaved] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [winCode, setWinCode] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hasReviewed") !== "true") {
      navigate({ to: "/" });
      return;
    }
    // Réinitialise le blocage après 24h
    const spunAt = Number(localStorage.getItem("spunAt") || 0);
    if (localStorage.getItem("hasSpun") === "true") {
      if (spunAt && Date.now() - spunAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem("hasSpun");
        localStorage.removeItem("spunAt");
      } else {
        setAlreadySpun(true);
      }
    }

    (async () => {
      const { data } = await supabase.from("rewards").select("*").eq("active", true);
      setRewards((data as Reward[]) || []);
      setReady(true);
    })();
  }, [navigate]);

  const segments: Segment[] = useMemo(() => {
    const rewardSegments = rewards.map((r, i) => ({
      rewardId: r.id,
      label: r.name,
      short: r.short_label,
      color: COLORS[i % COLORS.length],
      emoji: EMOJIS[i % EMOJIS.length],
    }));
    return [...rewardSegments, LOSE_SEGMENT];
  }, [rewards]);

  const segAngle = 360 / (segments.length || 1);

  const conicGradient = useMemo(() => {
    const stops = segments.map((s, i) => `${s.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`).join(", ");
    return `conic-gradient(${stops})`;
  }, [segments, segAngle]);

  // Détermine les lots encore disponibles sur leur période (jour/semaine, + créneau matin/après-midi pour les lots journaliers multi-quota)
  async function getEligibleRewards(): Promise<Reward[]> {
    const dayStart = startOfDayISO();
    const weekStart = startOfWeekISO();
    const eligible: Reward[] = [];

    for (const r of rewards) {
      const periodStart = r.frequency === "week" ? weekStart : dayStart;
      const { count } = await supabase
        .from("spins")
        .select("id", { count: "exact", head: true })
        .eq("reward_id", r.id)
        .eq("result", "win")
        .gte("created_at", periodStart);

      const won = count || 0;

      if (r.frequency === "day" && r.quota_morning != null && r.quota_afternoon != null) {
        // Compte séparément les gains du créneau en cours (matin/après-midi)
        const slotStart = new Date();
        if (isMorning()) {
          slotStart.setHours(0, 0, 0, 0);
        } else {
          slotStart.setHours(13, 0, 0, 0);
        }
        const { count: slotCount } = await supabase
          .from("spins")
          .select("id", { count: "exact", head: true })
          .eq("reward_id", r.id)
          .eq("result", "win")
          .gte("created_at", slotStart.toISOString());
        const slotQuota = isMorning() ? r.quota_morning : r.quota_afternoon;
        if ((slotCount || 0) < slotQuota) eligible.push(r);
      } else if (won < r.quota) {
        eligible.push(r);
      }
    }
    return eligible;
  }

  async function lastSpinWasWin(): Promise<boolean> {
    const { data } = await supabase
      .from("spins")
      .select("result")
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0]?.result === "win";
  }

  async function decideOutcome(): Promise<Segment> {
    const noRepeat = await lastSpinWasWin();
    const eligible = noRepeat ? [] : await getEligibleRewards();

    if (eligible.length === 0) return LOSE_SEGMENT;

    // Tirage pondéré : chaque lot dispo a un poids de 1, "Perdu" a un poids fixe (LOSE_WEIGHT)
    const total = eligible.length + LOSE_WEIGHT;
    let r = Math.random() * total;
    for (const rew of eligible) {
      r -= 1;
      if (r <= 0) {
        const seg = segments.find((s) => s.rewardId === rew.id);
        return seg || LOSE_SEGMENT;
      }
    }
    return LOSE_SEGMENT;
  }

  async function saveContact() {
    if (!name.trim() || !phone.trim()) return;
    const { data } = await supabase
      .from("clients")
      .insert({ name: name.trim(), phone: phone.trim() })
      .select("id")
      .single();
    if (data?.id) {
      localStorage.setItem("rollsy_client_id", data.id);
      setContactSaved(true);
    }
  }

  async function handleSpin() {
    if (spinning || alreadySpun || !contactSaved) return;
    setSpinning(true);

    const outcome = await decideOutcome();
    const idx = segments.findIndex((s) => s.rewardId === outcome.rewardId && s.label === outcome.label);
    const targetAngle = idx * segAngle + segAngle / 2;
    const spins = 5; // tours complets pour l'effet visuel
    const finalRotation = rotation + spins * 360 + (360 - targetAngle);
    setRotation(finalRotation);

    setTimeout(async () => {
      setResult(outcome);
      setSpinning(false);
      localStorage.setItem("hasSpun", "true");
      localStorage.setItem("spunAt", String(Date.now()));
      setAlreadySpun(true);

      const clientId = localStorage.getItem("rollsy_client_id");
      let code: string | null = null;
      if (outcome.rewardId) {
        code = generateCode();
        setWinCode(code);
        fireConfetti();
      }

      await supabase.from("spins").insert({
        client_id: clientId,
        reward_id: outcome.rewardId,
        result: outcome.rewardId ? "win" : "lose",
        code,
      });
    }, 4200);
  }

  if (!ready) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
      {!contactSaved && !alreadySpun && (
        <div className="ink-border-thick w-full max-w-sm rounded-3xl bg-white p-8 shadow-pop-pink">
          <h1 className="mb-4 font-display text-2xl font-extrabold">Avant de jouer 🎉</h1>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre prénom"
            className="ink-border mb-3 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Votre téléphone"
            className="ink-border mb-4 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          <button
            onClick={saveContact}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink"
          >
            Continuer 🚀
          </button>
        </div>
      )}

      {contactSaved && (
        <>
          <div className="relative h-72 w-72 sm:h-96 sm:w-96">
            {/* Pointeur fixe qui indique le segment gagnant — ne tourne jamais avec la roue */}
            <div
              className="absolute left-1/2 top-[-14px] z-10 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderTop: "26px solid #1a1a1a",
                filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.2))",
              }}
            />
            <div
              ref={wheelRef}
              className="relative h-72 w-72 rounded-full ink-border-thick sm:h-96 sm:w-96"
              style={{ background: conicGradient, transform: `rotate(${rotation}deg)`, transition: "transform 4s cubic-bezier(0.17,0.67,0.16,0.99)" }}
            >
              {segments.map((s, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-left text-sm font-extrabold"
                  style={{ transform: `rotate(${i * segAngle + segAngle / 2}deg) translateX(60px)` }}
                >
                  {s.emoji} {s.short}
                </div>
              ))}
            </div>
          </div>

          {!alreadySpun ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSpin}
              disabled={spinning}
              className="ink-border-thick min-h-[56px] rounded-full bg-pink px-8 font-extrabold uppercase text-white shadow-pop-ink"
            >
              {spinning ? "🎰 Ça tourne..." : "Tourner la roue 🎉"}
            </motion.button>
          ) : (
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  {result.rewardId ? (
                    <>
                      <p className="font-display text-2xl font-extrabold text-pink">Gagné : {result.label} 🎉</p>
                      <p className="mt-2 text-lg font-bold">Code à présenter en caisse : {winCode}</p>
                      <p className="text-sm text-ink/60">À utiliser lors de votre prochain achat.</p>
                    </>
                  ) : (
                    <p className="font-display text-2xl font-extrabold">Perdu, retentez votre chance demain 😉</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </main>
  );
}
