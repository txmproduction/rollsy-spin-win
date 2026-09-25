// Server-only: plans, CRM, campagnes, abonnements.
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const PRO_PRICE_ID = "rollsy_pro_monthly";

// ---------- Plan ----------

export async function getMerchantForOwner(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("merchants")
    .select("id, company_name, email, plan, subscription_status")
    .eq("owner_id", userId)
    .maybeSingle();
  return data;
}

export async function getMyPlan(userId: string) {
  const m = await getMerchantForOwner(userId);
  if (!m) return null;
  const db = await admin();
  const { data: sub } = await db
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, environment")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    plan: (m.plan as "free" | "pro") ?? "free",
    companyName: m.company_name as string,
    subscription: sub
      ? {
          status: sub.status as string,
          currentPeriodEnd: (sub.current_period_end as string | null) ?? null,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        }
      : null,
  };
}

async function requirePro(userId: string) {
  const m = await getMerchantForOwner(userId);
  if (!m) throw new Error("Aucun commerce associé.");
  if (m.plan !== "pro") throw new Error("Fonction réservée à Rollsy Pro.");
  return m.id as string;
}

// ---------- CRM ----------

export const filtersSchema = z.object({
  consent: z.enum(["any", "yes", "no"]).default("any"),
  signedFrom: z.string().optional().nullable(),
  signedTo: z.string().optional().nullable(),
  minVisits: z.number().int().min(0).optional().nullable(),
  maxVisits: z.number().int().min(0).optional().nullable(),
  returnedWithinDays: z.number().int().min(1).max(3650).optional().nullable(),
  notReturnedDays: z.number().int().min(1).max(3650).optional().nullable(),
  search: z.string().max(80).optional().nullable(),
});
export type CrmFilters = z.infer<typeof filtersSchema>;

export type CrmRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  visits: number;
  lastVisit: string | null;
  lastWin: string | null;
  marketingConsent: boolean;
};

async function loadAllClients(merchantId: string): Promise<CrmRow[]> {
  const db = await admin();
  const [{ data: clients }, { data: spins }, { data: rewards }] = await Promise.all([
    db
      .from("clients")
      .select("id, name, phone, email, created_at, marketing_consent")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(5000),
    db
      .from("spins")
      .select("client_id, result, reward_id, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: true })
      .limit(20000),
    db.from("rewards").select("id, name").eq("merchant_id", merchantId),
  ]);
  const rewardName = new Map((rewards ?? []).map((r) => [r.id as string, r.name as string]));
  const stats = new Map<string, { visits: number; last: string | null; win: string | null }>();
  for (const s of spins ?? []) {
    if (!s.client_id) continue;
    const st = stats.get(s.client_id) ?? { visits: 0, last: null, win: null };
    st.visits += 1;
    st.last = s.created_at as string;
    if (s.result === "win" && s.reward_id) st.win = rewardName.get(s.reward_id) ?? st.win;
    stats.set(s.client_id, st);
  }
  return (clients ?? []).map((c) => {
    const parts = ((c.name as string | null) ?? "").trim().split(/\s+/).filter(Boolean);
    const st = stats.get(c.id as string);
    return {
      id: c.id as string,
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      phone: (c.phone as string | null) ?? null,
      email: (c.email as string | null) ?? null,
      createdAt: c.created_at as string,
      visits: st?.visits ?? 0,
      lastVisit: st?.last ?? null,
      lastWin: st?.win ?? null,
      marketingConsent: Boolean(c.marketing_consent),
    };
  });
}

function applyFilters(rows: CrmRow[], f: CrmFilters) {
  const now = Date.now();
  const day = 86400000;
  return rows.filter((r) => {
    if (f.consent === "yes" && !r.marketingConsent) return false;
    if (f.consent === "no" && r.marketingConsent) return false;
    if (f.signedFrom && r.createdAt < f.signedFrom) return false;
    if (f.signedTo && r.createdAt.slice(0, 10) > f.signedTo) return false;
    if (f.minVisits != null && r.visits < f.minVisits) return false;
    if (f.maxVisits != null && r.visits > f.maxVisits) return false;
    const last = r.lastVisit ? new Date(r.lastVisit).getTime() : null;
    if (f.returnedWithinDays != null && (!last || now - last > f.returnedWithinDays * day))
      return false;
    if (f.notReturnedDays != null && last && now - last < f.notReturnedDays * day) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = `${r.firstName} ${r.lastName} ${r.phone ?? ""} ${r.email ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function listCrmClients(userId: string, filters: CrmFilters) {
  const merchantId = await requirePro(userId);
  const all = await loadAllClients(merchantId);
  return { total: all.length, rows: applyFilters(all, filters) };
}

export const segmentSchema = z.object({ name: z.string().trim().min(1).max(80), filters: filtersSchema });

export async function listSegments(userId: string) {
  const merchantId = await requirePro(userId);
  const db = await admin();
  const { data } = await db
    .from("crm_segments")
    .select("id, name, filters, created_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    filters: filtersSchema.parse(s.filters ?? {}),
    createdAt: s.created_at as string,
  }));
}

export async function createSegment(userId: string, input: z.infer<typeof segmentSchema>) {
  const merchantId = await requirePro(userId);
  const db = await admin();
  const { error } = await db
    .from("crm_segments")
    .insert({ merchant_id: merchantId, name: input.name, filters: input.filters });
  if (error) throw new Error("Impossible d'enregistrer le segment.");
  return { ok: true as const };
}

export async function deleteSegment(userId: string, id: string) {
  const merchantId = await requirePro(userId);
  const db = await admin();
  await db.from("crm_segments").delete().eq("id", id).eq("merchant_id", merchantId);
  return { ok: true as const };
}

// ---------- Campagnes (Brevo, compte TXM central) ----------

export const campaignSchema = z
  .object({
    channel: z.enum(["sms", "email"]),
    segmentId: z.string().uuid().nullable(),
    subject: z.string().trim().max(150).optional().nullable(),
    body: z.string().trim().min(1).max(2000),
  })
  .refine((d) => d.channel === "sms" || (d.subject && d.subject.length > 0), {
    message: "Objet requis pour un email",
  });

function toE164(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("33")) return d;
  if (d.startsWith("0") && d.length === 10) return `33${d.slice(1)}`;
  return d;
}

export async function listCampaigns(userId: string) {
  const merchantId = await requirePro(userId);
  const db = await admin();
  const { data } = await db
    .from("campaigns")
    .select("id, channel, segment_name, subject, recipients, sent, status, created_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id as string,
    channel: c.channel as "sms" | "email",
    segmentName: c.segment_name as string,
    subject: (c.subject as string | null) ?? null,
    recipients: c.recipients as number,
    sent: c.sent as number,
    status: c.status as string,
    createdAt: c.created_at as string,
  }));
}

export async function sendCampaign(userId: string, input: z.infer<typeof campaignSchema>) {
  const merchantId = await requirePro(userId);
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey) throw new Error("L'envoi de campagnes n'est pas encore activé.");
  const db = await admin();
  const { data: merchant } = await db
    .from("merchants")
    .select("company_name")
    .eq("id", merchantId)
    .single();
  const company = (merchant?.company_name as string) ?? "Rollsy";

  let filters: CrmFilters = filtersSchema.parse({ consent: "yes" });
  let segmentName = "Consentement marketing : oui";
  if (input.segmentId) {
    const { data: seg } = await db
      .from("crm_segments")
      .select("name, filters")
      .eq("id", input.segmentId)
      .eq("merchant_id", merchantId)
      .maybeSingle();
    if (!seg) throw new Error("Segment introuvable.");
    filters = filtersSchema.parse(seg.filters ?? {});
    segmentName = seg.name as string;
  }
  // RGPD : on n'envoie jamais aux clients sans consentement.
  const rows = applyFilters(await loadAllClients(merchantId), filters).filter(
    (r) => r.marketingConsent,
  );
  const targets =
    input.channel === "sms" ? rows.filter((r) => r.phone) : rows.filter((r) => r.email);

  let sent = 0;
  const headers = { "api-key": apiKey, "content-type": "application/json", accept: "application/json" };
  const senderEmail = process.env["BREVO_SENDER_EMAIL"] ?? "contact@notify.rollsyreview.app";
  const smsSender = company.replace(/[^A-Za-z0-9]/g, "").slice(0, 11) || "Rollsy";
  for (const t of targets) {
    try {
      const res =
        input.channel === "sms"
          ? await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
              method: "POST",
              headers,
              body: JSON.stringify({
                sender: smsSender,
                recipient: toE164(t.phone!),
                content: `${input.body}\nSTOP au 36173`,
                type: "marketing",
              }),
            })
          : await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers,
              body: JSON.stringify({
                sender: { name: company, email: senderEmail },
                to: [{ email: t.email, name: `${t.firstName} ${t.lastName}`.trim() || undefined }],
                subject: input.subject,
                textContent: input.body,
              }),
            });
      if (res.ok) sent += 1;
      else console.error("[brevo]", res.status, await res.text());
    } catch (e) {
      console.error("[brevo] send failed", e);
    }
  }

  await db.from("campaigns").insert({
    merchant_id: merchantId,
    channel: input.channel,
    segment_id: input.segmentId,
    segment_name: segmentName,
    subject: input.channel === "email" ? input.subject : null,
    body: input.body,
    recipients: targets.length,
    sent,
    status: targets.length === 0 ? "empty" : sent === targets.length ? "sent" : sent === 0 ? "failed" : "partial",
  });
  return { recipients: targets.length, sent };
}

// ---------- Super admin ----------

export const planUpdateSchema = z.object({
  merchantId: z.string().uuid(),
  plan: z.enum(["free", "pro"]),
});

export async function setPlanAsSuperAdmin(userId: string, input: z.infer<typeof planUpdateSchema>) {
  const { assertSuperAdmin } = await import("./rollsy.server");
  await assertSuperAdmin(userId);
  const db = await admin();
  const { error } = await db.from("merchants").update({ plan: input.plan }).eq("id", input.merchantId);
  if (error) throw new Error("Impossible de modifier le plan.");
  return { ok: true as const };
}

// ---------- Webhook ----------

/** Règles : payé → Pro + accès permanent ; annulé → Pro jusqu'à fin de période ; impayé → Free tout de suite. */
export async function syncMerchantFromSubscription(sub: {
  userId: string;
  status: string;
  currentPeriodEnd: string | null;
}) {
  const db = await admin();
  const periodActive = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd).getTime() > Date.now();
  const isPro =
    ((sub.status === "active" || sub.status === "trialing") && periodActive) ||
    (sub.status === "canceled" && sub.currentPeriodEnd != null && periodActive);
  const patch: Record<string, unknown> = { plan: isPro ? "pro" : "free", subscription_status: sub.status };
  if (isPro) patch.access_status = "active";
  await db.from("merchants").update(patch).eq("owner_id", sub.userId);
}

export async function upsertSubscriptionRow(row: Record<string, unknown>) {
  const db = await admin();
  const { data: m } = await db
    .from("merchants")
    .select("id")
    .eq("owner_id", row.user_id as string)
    .maybeSingle();
  await db
    .from("subscriptions")
    .upsert({ ...row, merchant_id: m?.id ?? null } as never, { onConflict: "stripe_subscription_id" });
}

export async function updateSubscriptionRow(
  stripeSubId: string,
  env: string,
  patch: Record<string, unknown>,
) {
  const db = await admin();
  const { data } = await db
    .from("subscriptions")
    .update(patch as never)
    .eq("stripe_subscription_id", stripeSubId)
    .eq("environment", env)
    .select("user_id, status, current_period_end")
    .maybeSingle();
  return data as { user_id: string; status: string; current_period_end: string | null } | null;
}

/** Repasse en Free les comptes dont l'abonnement annulé a atteint sa fin de période. */
export async function expireEndedSubscriptions(userId: string) {
  const db = await admin();
  const { data: sub } = await db
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return;
  if (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end as string) < new Date()) {
    await db.from("merchants").update({ plan: "free" }).eq("owner_id", userId).eq("plan", "pro");
  }
}

export async function getStripeCustomerId(userId: string, env: string) {
  const db = await admin();
  const { data } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.stripe_customer_id as string | undefined) ?? null;
}
