import { useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { createClientContact, spinWheel } from "@/lib/rollsy.functions";
import type { PublicMerchant } from "@/lib/player";

type Segment = { rewardId: string | null; label: string; short: string; color: string; emoji: string };

const LOSE_SEGMENT: Segment = { rewardId: null, label: "Perdu", short: "Perdu", color: "#A855F7", emoji: "🔁" };
const COLORS = ["#FF3DA6", "#FFE600", "#00D26A", "#00B4FF", "#FF6B00"];
const FALLBACK_EMOJIS = ["🎁", "🎉", "⭐", "🏆", "🎈", "✨", "🍀", "💥"];

// Choisit un emoji cohérent avec le libellé du lot.
const EMOJI_RULES: Array<[RegExp, string]> = [
  [/caf[eé]|expresso|espresso/i, "☕"],
  [/th[eé]\b|infusion/i, "🍵"],
  [/bubble\s*tea|smoothie|milkshake|jus|boisson|soda|limonade|verre/i, "🥤"],
  [/bi[eè]re|pinte/i, "🍺"],
  [/vin|champagne|coupe/i, "🍷"],
  [/cocktail|mojito|ap[eé]ro/i, "🍹"],
  [/donut|beignet/i, "🍩"],
  [/g[aâ]teau|p[aâ]tisserie|part de/i, "🍰"],
  [/cookie|biscuit|sabl[eé]/i, "🍪"],
  [/croissant|viennoiserie|pain au chocolat/i, "🥐"],
  [/cr[eê]pe|gaufre|pancake/i, "🥞"],
  [/glace|sorbet|cr[eè]me glac/i, "🍦"],
  [/sucette|bonbon|chocolat|friandise/i, "🍬"],
  [/pizza/i, "🍕"],
  [/burger|hamburger/i, "🍔"],
  [/frite/i, "🍟"],
  [/poulet|tenders|nugget|wings/i, "🍗"],
  [/sandwich|panini|wrap|kebab|tacos/i, "🥪"],
  [/salade/i, "🥗"],
  [/sushi|maki/i, "🍣"],
  [/pasta|p[aâ]tes/i, "🍝"],
  [/menu|repas|plat|d[eé]jeuner|d[îi]ner/i, "🍽️"],
  [/remise|r[eé]duction|%|promo|solde/i, "💸"],
  [/bon d'achat|bon achat|avoir|ch[eè]que|euro|€/i, "💶"],
  [/gratuit|offert(e)?\b/i, "🎁"],
  [/estimation|expertise|diagnostic|conseil|consultation/i, "📋"],
  [/visite|rendez-vous|rdv/i, "🗓️"],
  [/porte[- ]?cl[eé]f?s?|cl[eé]/i, "🔑"],
  [/stylo|crayon/i, "🖊️"],
  [/calendrier|agenda/i, "📆"],
  [/cabas|sac|tote/i, "🛍️"],
  [/bandana|foulard|[eé]charpe/i, "🧣"],
  [/casquette|bonnet|chapeau/i, "🧢"],
  [/t-?shirt|tee|v[eê]tement|textile/i, "👕"],
  [/mug|tasse|gourde/i, "🥛"],
  [/jeton|token|coin/i, "🪙"],
  [/bougie|parfum/i, "🕯️"],
  [/fleur|bouquet|rose/i, "💐"],
  [/livre|bd|magazine/i, "📚"],
  [/photo|shooting/i, "📸"],
  [/massage|soin|spa|beaut[eé]/i, "💆"],
  [/coiffure|shampoing|coupe de cheveux/i, "💇"],
  [/ongle|manucure|vernis/i, "💅"],
  [/lavage|nettoyage|voiture|auto/i, "🚗"],
  [/gros lot|jackpot|grand prix|super/i, "🏆"],
  [/tirage|tombola|ticket/i, "🎟️"],
  [/perdu|dommage|retente|rejou/i, "🔁"],
];

function emojiFor(text: string, index: number): string {
  for (const [re, emoji] of EMOJI_RULES) if (re.test(text)) return emoji;
  return FALLBACK_EMOJIS[index % FALLBACK_EMOJIS.length]!;
}

function polarPoint(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 200 + radius * Math.cos(radians),
    y: 200 + radius * Math.sin(radians),
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const start = polarPoint(startAngle, 184);
  const end = polarPoint(endAngle, 184);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M 200 200 L ${start.x} ${start.y} A 184 184 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function wrapSegmentLabel(label: string, segmentAngle: number): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const maxCharacters = segmentAngle <= 36 ? 10 : segmentAngle <= 52 ? 12 : 15;
  const lines: string[] = [];

  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current || current.length + word.length + 1 > maxCharacters) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  if (lines.length <= 3) return lines;
  return [lines[0] ?? "", lines[1] ?? "", lines.slice(2).join(" ")];
}

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
  const goHome = () =>
    merchant.isDefault
      ? navigate({ to: "/" })
      : navigate({ to: "/m/$slug", params: { slug: merchant.slug } });
  const reviewedKey = `hasReviewed:${merchant.slug}`;
  const spunKey = `hasSpun:${merchant.slug}`;
  const spunAtKey = `spunAt:${merchant.slug}`;
  const clientKey = `rollsy_client_id:${merchant.slug}`;

  const [ready, setReady] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewOpened, setReviewOpened] = useState(false);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
    if (localStorage.getItem(reviewedKey) === "true") setHasReviewed(true);
    setReady(true);
  }, [navigate, merchant.isDefault, merchant.slug, spunKey, spunAtKey, clientKey, reviewedKey]);

  function openReview() {
    if (typeof window === "undefined") return;
    setReviewOpened(true);
    if (merchant.goalUrl) window.open(merchant.goalUrl, "_blank", "noopener,noreferrer");
  }

  function confirmReview() {
    if (typeof window !== "undefined") localStorage.setItem(reviewedKey, "true");
    setHasReviewed(true);
  }


  const segments: Segment[] = useMemo(() => {
    const rewardSegments = merchant.rewards.map((r, i) => ({
      rewardId: r.id,
      label: r.name,
      short: r.short_label || r.name,
      color: COLORS[i % COLORS.length]!,
      emoji: emojiFor(`${r.name} ${r.short_label ?? ""}`, i),
    }));
    if (merchant.alwaysWin) return rewardSegments;
    return [...rewardSegments, LOSE_SEGMENT];
  }, [merchant.rewards, merchant.alwaysWin]);

  const segAngle = 360 / (segments.length || 1);

  const displayedRotation = ((rotation % 360) + 360) % 360;

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 9 && phoneDigits.length <= 15;

  async function saveContact() {
    if (!name.trim() || !lastName.trim() || !terms) return;
    if (!phoneValid) {
      setPhoneError("Entrez un numéro de téléphone valide (ex. 06 12 34 56 78).");
      return;
    }
    setPhoneError(null);
    try {
      const { id } = await createClientContact({
        data: {
          slug: merchant.slug,
          name: `${name.trim()} ${lastName.trim()}`,
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
      {merchant.logoUrl && (
        <img
          src={merchant.logoUrl}
          alt={`Logo ${merchant.companyName}`}
          className="ink-border-thick h-20 w-20 rounded-full bg-white object-contain p-2 shadow-pop-ink"
        />
      )}

      {!hasReviewed && !alreadySpun && (
        <div className="ink-border-thick w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-pop-pink">
          <h1 className="mb-3 font-display text-2xl font-extrabold">Une étape avant de jouer ⭐</h1>
          <p className="mb-6 text-sm font-bold text-ink/70">
            Laissez votre avis, puis revenez ici pour tourner la roue.
          </p>
          <button
            onClick={openReview}
            className="ink-border-thick mb-3 min-h-[52px] w-full rounded-full bg-pink px-6 font-extrabold uppercase text-white shadow-pop-ink"
          >
            {merchant.goalLabel} ⭐
          </button>
          <button
            onClick={confirmReview}
            className="ink-border min-h-[52px] w-full rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
          >
            J'ai laissé mon avis → Jouer 🎰
          </button>
          {!reviewOpened && (
            <p className="mt-4 text-xs font-semibold text-ink/50">
              Déjà fait ? Cliquez simplement sur « J'ai laissé mon avis ».
            </p>
          )}
        </div>
      )}

      {hasReviewed && !contactSaved && !alreadySpun && (
        <div className="ink-border-thick w-full max-w-sm rounded-3xl bg-white p-8 shadow-pop-pink">
          <h1 className="mb-4 font-display text-2xl font-extrabold">Avant de jouer 🎉</h1>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre prénom"
            autoComplete="given-name"
            className="ink-border mb-3 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Votre nom"
            autoComplete="family-name"
            className="ink-border mb-3 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^\d+ .-]/g, ""));
              setPhoneError(null);
            }}
            placeholder="Votre téléphone (06 12 34 56 78)"
            autoComplete="tel"
            className="ink-border mb-2 min-h-[52px] w-full rounded-full bg-yellow/30 px-5 font-bold outline-none"
          />
          {phoneError && (
            <p className="mb-3 text-sm font-extrabold text-red-600">{phoneError}</p>
          )}

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
            disabled={!terms || !name.trim() || !lastName.trim() || !phoneValid}
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
            onClick={() => void goHome()}
            className="ink-border-thick min-h-[52px] w-full rounded-full bg-yellow px-6 font-extrabold uppercase shadow-pop-ink"
          >
            Retour à l'accueil 🏠
          </button>
        </div>
      )}

      {hasReviewed && contactSaved && (
        <>
          <div className="wheel-shell relative h-72 w-72 sm:h-96 sm:w-96">
            <div className="wheel-pointer absolute left-1/2 top-[-10px] z-30 -translate-x-1/2" aria-hidden />
            <svg
              viewBox="0 0 400 400"
              className="relative z-10 h-full w-full overflow-visible"
              role="img"
              aria-label={`Roue de ${merchant.companyName}`}
            >
              <defs>
                <filter id="wheel-module-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--wheel-shadow)" />
                </filter>
                <radialGradient id="wheel-gloss" cx="42%" cy="34%" r="72%">
                  <stop offset="0%" stopColor="var(--wheel-highlight)" />
                  <stop offset="58%" stopColor="var(--wheel-highlight-clear)" />
                  <stop offset="100%" stopColor="var(--wheel-shade)" />
                </radialGradient>
              </defs>

              <g
                className="wheel-rotor"
                style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "200px 200px" }}
              >
                {segments.map((segment, index) => {
                  const inset = Math.min(1.3, segAngle * 0.04);
                  return (
                    <g key={segment.rewardId ?? "lose"} filter="url(#wheel-module-shadow)">
                      <path
                        d={segmentPath(index * segAngle + inset, (index + 1) * segAngle - inset)}
                        fill={segment.color}
                        stroke="var(--wheel-separator)"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d={segmentPath(index * segAngle + inset, (index + 1) * segAngle - inset)}
                        fill="url(#wheel-gloss)"
                        className="pointer-events-none"
                      />
                    </g>
                  );
                })}
                <circle cx="200" cy="200" r="184" fill="none" stroke="var(--wheel-rim)" strokeWidth="9" />
              </g>

              <g className={`wheel-labels ${spinning ? "wheel-labels-spinning" : ""}`}>
                {segments.map((segment, index) => {
                  const angle = index * segAngle + segAngle / 2 + displayedRotation;
                  const point = polarPoint(angle, segments.length >= 9 ? 132 : 128);
                  const lines = wrapSegmentLabel(segment.short, segAngle);
                  const longest = Math.max(...lines.map((line) => line.length));
                  const fontSize = longest > 15 || segments.length >= 10 ? 10 : longest > 11 ? 11 : 12;
                  const lineHeight = fontSize + 1.5;
                  const textTop = point.y + 8 - ((lines.length - 1) * lineHeight) / 2;
                  return (
                    <g key={`label-${segment.rewardId ?? "lose"}`} transform={`translate(${point.x} ${point.y})`}>
                      <text
                        x="0"
                        y={-13}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="wheel-emoji"
                        aria-hidden
                      >
                        {segment.emoji}
                      </text>
                      <text
                        x="0"
                        y={textTop - point.y}
                        textAnchor="middle"
                        className="wheel-label"
                        style={{ fontSize }}
                      >
                        {lines.map((line, lineIndex) => (
                          <tspan key={`${line}-${lineIndex}`} x="0" dy={lineIndex === 0 ? 0 : lineHeight}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
              </g>

              <g className="wheel-hub" aria-hidden>
                <circle cx="200" cy="200" r="49" fill="var(--wheel-hub-ring)" />
                <circle cx="200" cy="200" r="40" fill="var(--wheel-hub)" />
                <circle cx="200" cy="200" r="33" fill="none" stroke="var(--wheel-hub-detail)" strokeWidth="1.5" />
                <text x="200" y="197" textAnchor="middle" className="wheel-hub-title">ROLLSY</text>
                <text x="200" y="213" textAnchor="middle" className="wheel-hub-subtitle">BONNE CHANCE</text>
              </g>
            </svg>
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
