import { useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { createClientContact, spinWheel } from "@/lib/rollsy.functions";
import type { PublicMerchant } from "@/lib/player";

type Segment = { rewardId: string | null; label: string; short: string; color: string; emoji: string };

const LOSE_SEGMENT: Segment = { rewardId: null, label: "Perdu", short: "Perdu", color: "#A855F7", emoji: "🔁" };
const COLORS = ["#FF3DA6", "#FFE600", "#00D26A", "#00B4FF", "#FF6B00"];
const EMOJIS = ["🍗", "🥤", "💸", "🎁", "🍰", "🎈", "🍟", "☕"];

function fireConfetti() {
  const burst = (opts: confetti.Options) =>
    confetti({ particleCount: 90, spread: 75, colors: COLORS, ...opts });
  burst({ origin: { x: 0.2, y: 0.6 }, angle: 60 });
  burst({ origin: { x: 0.8, y: 0.6 }, angle: 120 });
  setTimeout(() => burst({ origin: { x: 0.5, y: 0.3 }, particleCount: 160, spread: 110 }), 250);
}

function isPreviewEnv(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.includes("id-preview--") || h.endsWith("-dev.lovable.app");
}

export default function PlayerWheel({ merchant }: { merchant: PublicMerchant }) {
  const navigate = useNavigate();
  const homePath = merchant.isDefault ? "/" : `/m/${merchant.slug}`;
  const reviewedKey = `hasReviewed:${merchant.slug}`;
  const spunKey = `hasSpun:${merchant.slug}`;
  const spunAtKey = `spunAt:${merchant.slug}`;
  const clientKey = `rollsy_client_id:${merchant.slug}`;

  const [ready, setReady] = useState(false);
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
  const [spinError, setSpinError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewEnv()) {
      localStorage.removeItem(spunKey);
      localStorage.removeItem(spunAtKey);
    } else {
      if (localStorage.getItem(reviewedKey) !== "true") {
        navigate({ to: homePath });
        return;
      }
      const spunAt = Number(localStorage.getItem(spunAtKey) || 0);
      if (localStorage.getItem(spunKey) === "true") {
        if (spunAt && Date.now() - spunAt > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(spunKey);
          localStorage.removeItem(spunAtKey);
        } else {
          setAlreadySpun(true);
        }
      }
    }
    if (localStorage.getItem(clientKey)) setContactSaved(true);
    setReady(true);
  }, [navigate, homePath, reviewedKey, spunKey, spunAtKey, clientKey]);

  const segments: Segment[] = useMemo(() => {
    const rewardSegments = merchant.rewards.map((r, i) => ({
      rewardId: r.id,
      label: r.name,
      short: r.short_label || r.name.slice(0, 14),
      color: COLORS[i % COLORS.length]!,
      emoji: EMOJIS[i % EMOJIS.length]!,
    }));
    return [...rewardSegments, LOSE_SEGMENT];
  }, [merchant.rewards]);

  const segAngle = 360 / (segments.length || 1);

  const conicGradient = useMemo(() => {
    const stops = segments
      .map((s, i) => `${s.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
      .join(", ");
    return `conic-gradient(${stops})`;
  }, [segments, segAngle]);

  async function saveContact() {
    if (!name.trim() || !phone.trim() || !terms) return;
    try {
      const { id } = await createClientContact({
        data: {
          slug: merchant.slug,
          name: name.trim(),
          phone: phone.trim(),
          termsAccepted: true,
          marketingConsent: marketing,
        },
      });
      localStorage.setItem(clientKey, id);
      setContactSaved(true);
    } catch {
      alert("Impossible d'enregistrer vos informations, réessayez.");
    }
  }

  async function handleSpin() {
    if (spinning || alreadySpun) return;
    setSpinError(null);
    setResult(null);
    setWinCode(null);
    setSpinning(true);

    // L'animation démarre immédiatement, même si la réponse serveur tarde.
    const spinStartedAt = Date.now();
    setRotation((r) => r + 3 * 360);

    const storedId = typeof window !== "undefined" ? localStorage.getItem(clientKey) : null;
    let rewardId: string | null = null;
    let code: string | null = null;
    try {
      const res = await spinWheel({
        data: {
          slug: merchant.slug,
          clientId: storedId && /^[0-9a-f-]{36}$/i.test(storedId) ? storedId : null,
        },
      });
      rewardId = res.rewardId;
      code = res.code;
    } catch (err) {
      console.error("[rollsy] spin failed", err);
      setSpinning(false);
      setSpinError("Le tirage a échoué, retentez dans un instant.");
      return;
    }

    const outcome: Segment = segments.find((s) => s.rewardId === rewardId) ?? LOSE_SEGMENT;
    const foundIdx = segments.findIndex((s) => s.rewardId === outcome.rewardId && s.label === outcome.label);
    const idx = foundIdx >= 0 ? foundIdx : segments.length - 1;
    const targetAngle = idx * segAngle + segAngle / 2;

    setRotation((current) => {
      const currentMod = ((current % 360) + 360) % 360;
      const desiredMod = (((360 - targetAngle) % 360) + 360) % 360;
      const delta = (((desiredMod - currentMod) % 360) + 360) % 360;
      return current + 4 * 360 + delta;
    });

    const elapsed = Date.now() - spinStartedAt;
    setTimeout(() => {
      setResult(outcome);
      setSpinning(false);
      if (!isPreviewEnv()) {
        localStorage.setItem(spunKey, "true");
        localStorage.setItem(spunAtKey, String(Date.now()));
        setAlreadySpun(true);
      }
      if (outcome.rewardId) {
        setWinCode(code);
        fireConfetti();
      }
    }, Math.max(600, 4200 - elapsed));
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
              . <span style={{ color: "#FF3DA6" }}>*</span>
            </span>
          </label>

          <button
            onClick={saveContact}
            disabled={!terms || !name.trim() || !phone.trim()}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer 🚀
          </button>
        </div>
      )}

      {alreadySpun && !contactSaved && (
        <div className="ink-border-thick w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-pop-pink">
          <h1 className="mb-3 font-display text-2xl font-extrabold">Déjà joué aujourd'hui 🎰</h1>
          <p className="mb-6 font-bold text-ink/70">
            Vous avez déjà tourné la roue ! Revenez après votre prochain avis. ⭐
          </p>
          <button
            onClick={() => navigate({ to: homePath })}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
          >
            Retour à l'accueil 🏠
          </button>
        </div>
      )}

      {contactSaved && (
        <>
          <div className="relative h-72 w-72 sm:h-96 sm:w-96">
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
              className="ink-border-thick relative h-72 w-72 rounded-full sm:h-96 sm:w-96"
              style={{
                background: conicGradient,
                transform: `rotate(${rotation}deg)`,
                transition: "transform 4s cubic-bezier(0.17,0.67,0.16,0.99)",
              }}
            >
              {segments.map((s, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-left whitespace-nowrap text-sm font-extrabold"
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
          {spinError && (
            <p className="ink-border rounded-2xl bg-orange px-4 py-3 text-sm font-extrabold text-white">
              {spinError}
            </p>
          )}
          <AnimatePresence>
            {result && !spinning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                {result.rewardId ? (
                  <>
                    <p className="font-display text-2xl font-extrabold" style={{ color: "#FF3DA6" }}>
                      Gagné : {result.label} 🎉
                    </p>
                    {merchant.rewardMode === "next_visit" && winCode ? (
                      <>
                        <p className="mt-2 text-lg font-bold">Votre code : {winCode}</p>
                        <p className="text-sm text-ink/60">
                          À présenter en caisse lors de votre prochain passage (valable une seule fois).
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-lg font-bold">
                        Venez récupérer votre gain directement en caisse 🎁
                      </p>
                    )}
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
    </main>
  );
}
