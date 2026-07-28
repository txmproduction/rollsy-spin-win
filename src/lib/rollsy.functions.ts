import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOSE_WEIGHT = 5;

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
function isMorning() {
  return new Date().getHours() < 13;
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "rollsy2024";
}

function assertAdmin(password: string) {
  if (password !== adminPassword()) {
    throw new Error("Unauthorized");
  }
}

/** Enregistre le contact du joueur (écriture serveur uniquement). */
export const createClientContact = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        phone: z.string().trim().min(4).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("clients")
      .insert({ name: data.name, phone: data.phone })
      .select("id")
      .single();
    if (error) {
      console.error("[rollsy] createClientContact", error);
      throw new Error("Impossible d'enregistrer vos informations.");
    }
    return { id: row.id as string };
  });

/** Décide du résultat côté serveur (quotas, anti-répétition) puis enregistre le tour. */
export const spinWheel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ clientId: z.string().uuid().nullable().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rewards } = await supabaseAdmin
      .from("rewards")
      .select("id, name, frequency, quota, quota_morning, quota_afternoon")
      .eq("active", true);

    const { data: last } = await supabaseAdmin
      .from("spins")
      .select("result")
      .order("created_at", { ascending: false })
      .limit(1);
    const lastWasWin = last?.[0]?.result === "win";

    const eligible: { id: string; name: string }[] = [];
    if (!lastWasWin) {
      for (const r of rewards ?? []) {
        const periodStart = r.frequency === "week" ? startOfWeek() : startOfDay();
        const { count } = await supabaseAdmin
          .from("spins")
          .select("id", { count: "exact", head: true })
          .eq("reward_id", r.id)
          .eq("result", "win")
          .gte("created_at", periodStart.toISOString());

        if (r.frequency === "day" && r.quota_morning != null && r.quota_afternoon != null) {
          const slotStart = new Date();
          if (isMorning()) slotStart.setHours(0, 0, 0, 0);
          else slotStart.setHours(13, 0, 0, 0);
          const { count: slotCount } = await supabaseAdmin
            .from("spins")
            .select("id", { count: "exact", head: true })
            .eq("reward_id", r.id)
            .eq("result", "win")
            .gte("created_at", slotStart.toISOString());
          const slotQuota = isMorning() ? r.quota_morning : r.quota_afternoon;
          if ((slotCount ?? 0) < slotQuota) eligible.push({ id: r.id, name: r.name });
        } else if ((count ?? 0) < r.quota) {
          eligible.push({ id: r.id, name: r.name });
        }
      }
    }

    let won: { id: string; name: string } | null = null;
    if (eligible.length > 0) {
      let roll = Math.random() * (eligible.length + LOSE_WEIGHT);
      for (const rew of eligible) {
        roll -= 1;
        if (roll <= 0) {
          won = rew;
          break;
        }
      }
    }

    const code = won ? generateCode() : null;
    const { error } = await supabaseAdmin.from("spins").insert({
      client_id: data.clientId ?? null,
      reward_id: won?.id ?? null,
      result: won ? "win" : "lose",
      code,
    });
    if (error) console.error("[rollsy] spinWheel insert", error);

    return { rewardId: won?.id ?? null, code };
  });

/** Données du tableau de bord admin — protégées par mot de passe vérifié côté serveur. */
export const getAdminData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string() }).parse(data))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [spins, rewards, clients] = await Promise.all([
      supabaseAdmin
        .from("spins")
        .select("id, client_id, reward_id, result, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("rewards").select("id, name, short_label, frequency, quota"),
      supabaseAdmin
        .from("clients")
        .select("id, name, phone, email, created_at")
        .order("created_at", { ascending: false }),
    ]);

    return {
      spins: spins.data ?? [],
      rewards: rewards.data ?? [],
      clients: clients.data ?? [],
    };
  });

/** Vérifie le mot de passe admin côté serveur. */
export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string() }).parse(data))
  .handler(async ({ data }) => ({ ok: data.password === adminPassword() }));
