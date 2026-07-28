// Server-only helpers for Rollsy game logic. Never imported by client code directly.
import { z } from "zod";

const LOSE_WEIGHT = 5;

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(4).max(30),
});
export const spinSchema = z.object({ clientId: z.string().uuid().nullable().optional() });
export const passwordSchema = z.object({ password: z.string().max(200) });

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

export function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "rollsy2024";
}

export async function insertClientContact(input: { name: string; phone: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert({ name: input.name, phone: input.phone })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[rollsy] insertClientContact failed", error);
    throw new Error("Impossible d'enregistrer vos informations.");
  }
  return { id: data.id as string };
}

export async function decideAndRecordSpin(clientId: string | null) {
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

  const eligible: { id: string }[] = [];
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
        if ((slotCount ?? 0) < slotQuota) eligible.push({ id: r.id });
      } else if ((count ?? 0) < r.quota) {
        eligible.push({ id: r.id });
      }
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

  const code = wonId ? generateCode() : null;
  const { error } = await supabaseAdmin.from("spins").insert({
    client_id: clientId,
    reward_id: wonId,
    result: wonId ? "win" : "lose",
    code,
  });
  if (error) console.error("[rollsy] spin insert failed", error);

  return { rewardId: wonId, code };
}

export async function loadAdminData(password: string) {
  if (password !== adminPassword()) throw new Error("Unauthorized");
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
}
