// Server-only helpers for Rollsy game logic. Never imported by client code directly.
import { z } from "zod";

const LOSE_WEIGHT = 5;

export const DEFAULT_MERCHANT_SLUG = "afro-fouta";

export const contactSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return d.length >= 9 && d.length <= 15;
    }, "Numéro de téléphone invalide"),
  termsAccepted: z.literal(true),
  marketingConsent: z.boolean(),
});

export const slugSchema = z.object({ slug: z.string().trim().min(1).max(80) });

export const spinSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  clientId: z.string().uuid().nullable().optional(),
});

export const signupSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(6).max(30),
  companyName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
});

export const setupSchema = z.object({
  goalType: z.enum(["google", "instagram", "tiktok", "autre"]),
  goalUrl: z.string().trim().url().max(500),
  frequency: z.enum(["day", "week"]),
  rewards: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        quota: z.number().int().min(0).max(1000),
      }),
    )
    .min(2)
    .max(8),
  rewardMode: z.enum(["immediate", "next_visit"]).optional(),
  logoPath: z.string().trim().max(300).nullable().optional(),
  completeOnboarding: z.boolean().optional(),
});

export const codeSchema = z.object({
  spinId: z.string().uuid(),
  used: z.boolean(),
});

const GOAL_LABELS: Record<string, string> = {
  google: "Laisser un avis Google",
  instagram: "S'abonner à l'Instagram",
  tiktok: "S'abonner au TikTok",
  autre: "Découvrir la page",
};

export function goalLabel(goalType: string) {
  return GOAL_LABELS[goalType] ?? GOAL_LABELS.google!;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TXM-";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek(): Date {
  const d = startOfDay();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function slugify(input: string) {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "commerce"
  );
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type PublicMerchant = {
  id: string;
  slug: string;
  companyName: string;
  goalType: string;
  goalUrl: string | null;
  goalLabel: string;
  rewardMode: "immediate" | "next_visit";
  logoUrl: string | null;
  rewards: { id: string; name: string; short_label: string | null }[];
};

export const LOGO_BUCKET = "merchant-logos";

export async function signedLogoUrl(path: string | null | undefined) {
  if (!path) return null;
  const db = await admin();
  const { data } = await db.storage.from(LOGO_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export async function getPublicMerchant(slug: string): Promise<PublicMerchant | null> {
  const db = await admin();
  const { data: m } = await db
    .from("merchants")
    .select("id, slug, company_name, goal_type, goal_url, reward_mode, logo_path")
    .eq("slug", slug)
    .maybeSingle();
  if (!m) return null;
  const { data: rewards } = await db
    .from("rewards")
    .select("id, name, short_label")
    .eq("merchant_id", m.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  return {
    id: m.id as string,
    slug: m.slug as string,
    companyName: m.company_name as string,
    goalType: m.goal_type as string,
    goalUrl: (m.goal_url as string) ?? null,
    goalLabel: goalLabel(m.goal_type as string),
    rewardMode: (m.reward_mode as string) === "next_visit" ? "next_visit" : "immediate",
    logoUrl: await signedLogoUrl(m.logo_path as string | null),
    rewards: (rewards ?? []) as PublicMerchant["rewards"],
  };
}

async function merchantIdBySlug(slug: string) {
  const db = await admin();
  const { data } = await db.from("merchants").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string) ?? null;
}

export async function insertClientContact(input: {
  slug: string;
  name: string;
  phone: string;
  termsAccepted: boolean;
  marketingConsent: boolean;
  ip: string | null;
}) {
  const db = await admin();
  const merchantId = await merchantIdBySlug(input.slug);
  if (!merchantId) throw new Error("Commerce introuvable.");
  const { data, error } = await db
    .from("clients")
    .insert({
      merchant_id: merchantId,
      name: input.name,
      phone: input.phone,
      terms_accepted: input.termsAccepted,
      marketing_consent: input.marketingConsent,
      consent_at: new Date().toISOString(),
      consent_ip: input.ip,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[rollsy] insertClientContact failed", error);
    throw new Error("Impossible d'enregistrer vos informations.");
  }
  return { id: data.id as string };
}

export async function decideAndRecordSpin(slug: string, clientId: string | null) {
  const db = await admin();
  const { data: merchant } = await db
    .from("merchants")
    .select("id, reward_mode")
    .eq("slug", slug)
    .maybeSingle();
  if (!merchant) throw new Error("Commerce introuvable.");
  const merchantId = merchant.id as string;
  const rewardMode: "immediate" | "next_visit" =
    (merchant.reward_mode as string) === "next_visit" ? "next_visit" : "immediate";

  const { data: rewards } = await db
    .from("rewards")
    .select("id, name, frequency, quota")
    .eq("merchant_id", merchantId)
    .eq("active", true);

  const { data: last } = await db
    .from("spins")
    .select("result")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastWasWin = last?.[0]?.result === "win";

  const eligible: { id: string }[] = [];
  if (!lastWasWin) {
    for (const r of rewards ?? []) {
      const periodStart = r.frequency === "week" ? startOfWeek() : startOfDay();
      const { count } = await db
        .from("spins")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchantId)
        .eq("reward_id", r.id)
        .eq("result", "win")
        .gte("created_at", periodStart.toISOString());
      if ((count ?? 0) < r.quota) eligible.push({ id: r.id });
    }
  }

  let wonId: string | null = null;
  if (eligible.length > 0) {
    let roll = Math.random() * (eligible.length + LOSE_WEIGHT);
    for (const rew of eligible) {
      roll -= 1;
      if (roll <= 0) {
        wonId = rew.id;
        break;
      }
    }
  }

  const code = wonId && rewardMode === "next_visit" ? generateCode() : null;
  const { error } = await db.from("spins").insert({
    merchant_id: merchantId,
    client_id: clientId,
    reward_id: wonId,
    result: wonId ? "win" : "lose",
    code,
  });
  if (error) console.error("[rollsy] spin insert failed", error);

  return { rewardId: wonId, code, rewardMode };
}

// ---------- Espace commerçant (authentifié) ----------

export async function findMerchantByOwner(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("merchants")
    .select(
      "id, slug, company_name, first_name, last_name, phone, email, goal_type, goal_url, reward_mode, logo_path, status, access_status, onboarding_completed, trial_ends_at",
    )
    .eq("owner_id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function ensureMerchantForUser(
  userId: string,
  email: string,
  profile: z.infer<typeof signupSchema> | null,
) {
  const existing = await findMerchantByOwner(userId);
  if (existing) return existing;

  const db = await admin();
  const base = slugify(profile?.companyName ?? email.split("@")[0]!);
  let slug = base;
  for (let i = 2; i < 60; i++) {
    const { data } = await db.from("merchants").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { data, error } = await db
    .from("merchants")
    .insert({
      owner_id: userId,
      slug,
      company_name: profile?.companyName ?? email,
      first_name: profile?.firstName ?? null,
      last_name: profile?.lastName ?? null,
      phone: profile?.phone ?? null,
      email,
      status: "active",
      onboarding_completed: false,
      cgv_accepted_at: new Date().toISOString(),
      trial_ends_at: trialEnds.toISOString(),
    })
    .select(
      "id, slug, company_name, first_name, last_name, phone, email, goal_type, goal_url, reward_mode, logo_path, status, access_status, onboarding_completed, trial_ends_at",
    )
    .single();
  if (error || !data) {
    console.error("[rollsy] ensureMerchantForUser failed", error);
    throw new Error("Impossible de créer votre espace commerçant.");
  }
  return data;
}

async function requireMerchant(userId: string) {
  const m = await findMerchantByOwner(userId);
  if (!m) throw new Error("Aucun espace commerçant lié à ce compte.");
  return m;
}

export async function saveMerchantSetup(userId: string, input: z.infer<typeof setupSchema>) {
  const m = await requireMerchant(userId);
  const db = await admin();

  const { error: upErr } = await db
    .from("merchants")
    .update({
      goal_type: input.goalType,
      goal_url: input.goalUrl,
      ...(input.rewardMode ? { reward_mode: input.rewardMode } : {}),
      ...(input.logoPath !== undefined ? { logo_path: input.logoPath } : {}),
      ...(input.completeOnboarding ? { onboarding_completed: true } : {}),
    })
    .eq("id", m.id);
  if (upErr) {
    console.error("[rollsy] merchant update failed", upErr);
    throw new Error("Échec de l'enregistrement de la configuration.");
  }

  const { error: delErr } = await db.from("rewards").delete().eq("merchant_id", m.id);
  if (delErr) {
    console.error("[rollsy] rewards reset failed", delErr);
    throw new Error("Échec de la mise à jour des récompenses.");
  }

  const rows = input.rewards.map((r) => ({
    merchant_id: m.id,
    name: r.name,
    short_label: r.name.slice(0, 14),
    frequency: input.frequency,
    quota: r.quota,
    active: true,
  }));
  const { error: insErr } = await db.from("rewards").insert(rows);
  if (insErr) {
    console.error("[rollsy] rewards insert failed", insErr);
    throw new Error("Échec de la mise à jour des récompenses.");
  }
  return { ok: true as const, slug: m.slug as string };
}

export async function loadMerchantAdminData(userId: string) {
  const m = await requireMerchant(userId);
  const db = await admin();
  const [spins, rewards, clients] = await Promise.all([
    db
      .from("spins")
      .select("id, client_id, reward_id, result, code, code_used, created_at")
      .eq("merchant_id", m.id)
      .order("created_at", { ascending: false }),
    db
      .from("rewards")
      .select("id, name, short_label, frequency, quota")
      .eq("merchant_id", m.id)
      .order("created_at", { ascending: true }),
    db
      .from("clients")
      .select(
        "id, name, phone, email, created_at, terms_accepted, marketing_consent, consent_at, consent_ip",
      )
      .eq("merchant_id", m.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    merchant: m,
    logoUrl: await signedLogoUrl((m as { logo_path?: string | null }).logo_path ?? null),
    spins: spins.data ?? [],
    rewards: rewards.data ?? [],
    clients: clients.data ?? [],
  };
}

export async function setSpinCodeUsed(userId: string, spinId: string, used: boolean) {
  const m = await requireMerchant(userId);
  const db = await admin();
  const { error } = await db
    .from("spins")
    .update({ code_used: used })
    .eq("id", spinId)
    .eq("merchant_id", m.id);
  if (error) {
    console.error("[rollsy] code update failed", error);
    throw new Error("Impossible de mettre à jour ce code.");
  }
  return { ok: true as const };
}

export async function resetMerchantData(userId: string) {
  const m = await requireMerchant(userId);
  const db = await admin();
  const spinsRes = await db.from("spins").delete().eq("merchant_id", m.id);
  if (spinsRes.error) {
    console.error("[rollsy] reset spins failed", spinsRes.error);
    throw new Error("Échec de la réinitialisation des tours.");
  }
  const clientsRes = await db.from("clients").delete().eq("merchant_id", m.id);
  if (clientsRes.error) {
    console.error("[rollsy] reset clients failed", clientsRes.error);
    throw new Error("Échec de la réinitialisation des clients.");
  }
  return { ok: true as const };
}

// ---------- Accès (essai / permanent / suspendu) ----------

export type AccessStatus = "trial" | "active" | "suspended";

export type AccessState = {
  status: AccessStatus;
  effectiveStatus: AccessStatus;
  daysLeft: number | null;
  trialEndsAt: string | null;
  blocked: boolean;
  companyName: string | null;
};

export function computeAccess(row: {
  access_status?: string | null;
  trial_ends_at?: string | null;
  company_name?: string | null;
}): AccessState {
  const raw = (row.access_status ?? "trial") as string;
  const status: AccessStatus =
    raw === "active" || raw === "suspended" || raw === "trial" ? (raw as AccessStatus) : "trial";
  const trialEndsAt = row.trial_ends_at ?? null;
  let daysLeft: number | null = null;
  if (status === "trial" && trialEndsAt) {
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / 86_400_000));
  }
  const trialExpired = status === "trial" && (!trialEndsAt || (daysLeft ?? 0) <= 0);
  const effectiveStatus: AccessStatus =
    status === "suspended" || trialExpired ? "suspended" : status;
  return {
    status,
    effectiveStatus,
    daysLeft: status === "trial" ? (daysLeft ?? 0) : null,
    trialEndsAt,
    blocked: effectiveStatus === "suspended",
    companyName: row.company_name ?? null,
  };
}

export async function getAccessStateForUser(userId: string): Promise<AccessState | null> {
  const db = await admin();
  const { data } = await db
    .from("merchants")
    .select("company_name, access_status, trial_ends_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!data) return null;
  return computeAccess(data as Record<string, string | null>);
}

export async function getAccessStateBySlug(slug: string): Promise<AccessState | null> {
  const db = await admin();
  const { data } = await db
    .from("merchants")
    .select("company_name, access_status, trial_ends_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return computeAccess(data as Record<string, string | null>);
}

// ---------- Super admin ----------

export const accessUpdateSchema = z.object({
  merchantId: z.string().uuid(),
  accessStatus: z.enum(["trial", "active", "suspended"]),
  trialDays: z.number().int().min(1).max(365).optional(),
});

export async function assertSuperAdmin(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!data || (data as { is_super_admin?: boolean }).is_super_admin !== true) {
    throw new Error("Accès refusé.");
  }
  return true;
}

export type SuperAdminRow = {
  id: string;
  companyName: string;
  email: string;
  slug: string;
  createdAt: string;
  participants: number;
  wins: number;
  accessStatus: AccessStatus;
  daysLeft: number | null;
  trialEndsAt: string | null;
};

export async function listAllMerchants(userId: string): Promise<SuperAdminRow[]> {
  await assertSuperAdmin(userId);
  const db = await admin();
  const { data: merchants } = await db
    .from("merchants")
    .select("id, company_name, email, slug, created_at, access_status, trial_ends_at")
    .order("created_at", { ascending: false });

  const rows: SuperAdminRow[] = [];
  for (const m of merchants ?? []) {
    const id = m.id as string;
    const [{ count: participants }, { count: wins }] = await Promise.all([
      db.from("spins").select("id", { count: "exact", head: true }).eq("merchant_id", id),
      db
        .from("spins")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", id)
        .eq("result", "win"),
    ]);
    const access = computeAccess(m as Record<string, string | null>);
    rows.push({
      id,
      companyName: (m.company_name as string) ?? "—",
      email: (m.email as string) ?? "",
      slug: (m.slug as string) ?? "",
      createdAt: m.created_at as string,
      participants: participants ?? 0,
      wins: wins ?? 0,
      accessStatus: access.status,
      daysLeft: access.daysLeft,
      trialEndsAt: access.trialEndsAt,
    });
  }
  return rows;
}

export async function updateMerchantAccess(
  userId: string,
  input: z.infer<typeof accessUpdateSchema>,
) {
  await assertSuperAdmin(userId);
  const db = await admin();
  const patch: Record<string, string | null> = { access_status: input.accessStatus };
  if (input.accessStatus === "trial") {
    const end = new Date();
    end.setDate(end.getDate() + (input.trialDays ?? 14));
    patch['trial_ends_at'] = end.toISOString();
  }
  const { error } = await db.from("merchants").update(patch).eq("id", input.merchantId);
  if (error) {
    console.error("[rollsy] access update failed", error);
    throw new Error("Impossible de modifier l'accès de ce commerçant.");
  }
  return { ok: true as const };
}
