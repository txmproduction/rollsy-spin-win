import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { createClientContact, spinWheel } from "@/lib/rollsy.functions";

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





function fireConfetti() {
  const burst = (opts: confetti.Options) =>
    confetti({ particleCount: 90, spread: 75, colors: COLORS, ...opts });
  burst({ origin: { x: 0.2, y: 0.6 }, angle: 60 });
  burst({ origin: { x: 0.8, y: 0.6 }, angle: 120 });
  setTimeout(() => burst({ origin: { x: 0.5, y: 0.3 }, particleCount: 160, spread: 110 }), 250);
}

// En preview (chat Lovable / localhost), on autorise autant d'essais qu'on veut pour tester.
function isPreviewEnv(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.includes("id-preview--") || h.endsWith("-dev.lovable.app");
}


function RouePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactSaved, setContactSaved] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [winCode, setWinCode] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewEnv()) {
      // Mode test : on efface les blocages pour pouvoir rejouer à l'infini
      localStorage.removeItem("hasSpun");
      localStorage.removeItem("spunAt");
    } else {
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

  async function saveContact() {
    if (!name.trim() || !phone.trim() || !terms) return;
    try {
      const { id } = await createClientContact({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          termsAccepted: true,
          marketingConsent: marketing,
        },
      });
      localStorage.setItem("rollsy_client_id", id);
      setContactSaved(true);
    } catch {
      // message générique — les détails restent côté serveur
      alert("Impossible d'enregistrer vos informations, réessayez.");
    }
  }

  async function handleSpin() {
    if (spinning || alreadySpun || !contactSaved) return;
    setSpinning(true);

    const clientId = localStorage.getItem("rollsy_client_id");
    const { rewardId, code } = await spinWheel({
      data: { clientId: clientId && /^[0-9a-f-]{36}$/i.test(clientId) ? clientId : null },
    });
    const outcome: Segment = segments.find((s) => s.rewardId === rewardId) ?? LOSE_SEGMENT;
    const foundIdx = segments.findIndex((s) => s.rewardId === outcome.rewardId && s.label === outcome.label);
    const idx = foundIdx >= 0 ? foundIdx : segments.length - 1;
    // Le conic-gradient démarre à 12h et tourne dans le sens horaire :
    // le centre du segment i se trouve à idx*segAngle + segAngle/2 depuis le pointeur.
    const targetAngle = idx * segAngle + segAngle / 2;
    const spins = 5; // tours complets pour l'effet visuel
    // La roue peut déjà être dans une position quelconque (accumulée des tours précédents) —
    // on calcule le delta nécessaire à partir de sa position ACTUELLE, pas depuis 0.
    const currentMod = ((rotation % 360) + 360) % 360;
    const desiredMod = ((360 - targetAngle) % 360 + 360) % 360;
    const delta = ((desiredMod - currentMod) % 360 + 360) % 360;
    const finalRotation = rotation + spins * 360 + delta;
    setRotation(finalRotation);

    setTimeout(async () => {
      setResult(outcome);
      setSpinning(false);
      if (!isPreviewEnv()) {
        localStorage.setItem("hasSpun", "true");
        localStorage.setItem("spunAt", String(Date.now()));
        setAlreadySpun(true);
      }


      if (outcome.rewardId) {
        setWinCode(code);
        fireConfetti();
      }
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
          <label className="mb-3 flex cursor-pointer items-start gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#FF3DA6]"
            />
            <span>Oui, je veux mes prochaines offres en exclu par SMS 🎁</span>
          </label>

          <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#FF3DA6]"
            />
            <span>
              J'accepte les conditions générales d'utilisation et la{" "}
              <Link to="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              . <span className="text-pink">*</span>
            </span>
          </label>

          <button
            onClick={saveContact}
            disabled={!terms || !name.trim() || !phone.trim()}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer 🚀
          </button>
          <p className="mt-3 text-center text-xs font-semibold text-ink/50">
            <Link to="/confidentialite" className="underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      )}

      {alreadySpun && !contactSaved && (
        <div className="ink-border-thick w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-pop-pink">
          <h1 className="mb-3 font-display text-2xl font-extrabold">Déjà joué aujourd'hui 🎰</h1>
          <p className="mb-6 font-bold text-ink/70">
            Vous avez déjà tourné la roue ! Revenez après votre prochain avis. ⭐
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
          >
            Retour à l'accueil 🏠
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
                  className="absolute left-1/2 top-1/2 origin-left whitespace-nowrap text-sm font-extrabold"
                  // -90° car le conic-gradient part de 12h alors que rotate(0) pointe vers 3h
                  style={{ transform: `rotate(${i * segAngle + segAngle / 2 - 90}deg) translateX(48px)` }}
                >
                  {s.emoji} {s.short}
                </div>
              ))}
            </div>
          </div>

          {!alreadySpun && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSpin}
              disabled={spinning}
              className="ink-border-thick min-h-[56px] rounded-full bg-pink px-8 font-extrabold uppercase text-white shadow-pop-ink"
            >
              {spinning ? "🎰 Ça tourne..." : "Tourner la roue 🎉"}
            </motion.button>
          )}
          <AnimatePresence>
            {result && !spinning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                {result.rewardId ? (
                  <>
                    <p className="font-display text-2xl font-extrabold text-pink">Gagné : {result.label} 🎉</p>
                    <p className="mt-2 text-lg font-bold">Code à présenter en caisse : {winCode}</p>
                    <p className="text-sm text-ink/60">À utiliser lors de votre prochain achat.</p>
                  </>
                ) : (
                  <p className="font-display text-2xl font-extrabold">
                    {alreadySpun ? "Perdu, retentez votre chance demain 😉" : "Perdu ! Retente un tour 🔁"}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </>
      )}
      <a
        href="/admin"
        className="mt-10 text-[10px] font-semibold uppercase tracking-widest text-ink/30 hover:text-ink/60"
      >
        admin
      </a>
    </main>
  );
}
