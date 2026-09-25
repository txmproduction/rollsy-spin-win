import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getMyPlan,
  listCrmClients,
  filtersSchema,
  listSegments,
  createSegment,
  deleteSegment,
  segmentSchema,
  listCampaigns,
  sendCampaign,
  campaignSchema,
  setPlanAsSuperAdmin,
  planUpdateSchema,
  expireEndedSubscriptions,
  getStripeCustomerId,
  PRO_PRICE_ID,
} from "./pro.server";
import { createStripeClient, getStripeErrorMessage } from "./stripe.server";

const envSchema = z.enum(["sandbox", "live"]);

export const fetchMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await expireEndedSubscriptions(context.userId);
    return getMyPlan(context.userId);
  });

export const fetchCrmClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filtersSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => listCrmClients(context.userId, data));

export const fetchSegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listSegments(context.userId));

export const saveSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => segmentSchema.parse(d))
  .handler(async ({ context, data }) => createSegment(context.userId, data));

export const removeSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => deleteSegment(context.userId, data.id));

export const fetchCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listCampaigns(context.userId));

export const launchCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignSchema.parse(d))
  .handler(async ({ context, data }) => {
    try {
      return await sendCampaign(context.userId, data);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Envoi impossible." };
    }
  });

export const setMerchantPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planUpdateSchema.parse(d))
  .handler(async ({ context, data }) => setPlanAsSuperAdmin(context.userId, data));

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ returnUrl: z.string().url(), environment: envSchema }).parse(d),
  )
  .handler(async ({ context, data }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const plan = await getMyPlan(context.userId);
      if (!plan) return { error: "Aucun commerce associé à ce compte." };
      if (plan.plan === "pro") return { error: "Vous êtes déjà sur Rollsy Pro." };
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [PRO_PRICE_ID] });
      if (!prices.data.length) return { error: "Offre introuvable." };
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: (context.claims.email as string | undefined) ?? undefined,
        userId: context.userId,
      });
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: prices.data[0].id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId: context.userId, managed_payments: "true" },
        subscription_data: { metadata: { userId: context.userId } },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ returnUrl: z.string().url(), environment: envSchema }).parse(d),
  )
  .handler(async ({ context, data }): Promise<{ url: string } | { error: string }> => {
    const customerId = await getStripeCustomerId(context.userId, data.environment);
    if (!customerId) return { error: "Aucun abonnement trouvé." };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
