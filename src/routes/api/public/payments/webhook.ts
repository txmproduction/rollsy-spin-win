import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import {
  syncMerchantFromSubscription,
  upsertSubscriptionRow,
  updateSubscriptionRow,
} from "@/lib/pro.server";

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

function fields(subscription: any) {
  const item = subscription.items?.data?.[0];
  return {
    priceId: item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id,
    productId: item?.price?.product,
    periodStart: iso(item?.current_period_start ?? subscription.current_period_start),
    periodEnd: iso(item?.current_period_end ?? subscription.current_period_end),
  };
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const sub = event.data.object;
  switch (event.type) {
    case "customer.subscription.created": {
      const userId = sub.metadata?.userId;
      if (!userId) return;
      const f = fields(sub);
      await upsertSubscriptionRow({
        user_id: userId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer,
        product_id: f.productId,
        price_id: f.priceId,
        status: sub.status,
        current_period_start: f.periodStart,
        current_period_end: f.periodEnd,
        environment: env,
        updated_at: new Date().toISOString(),
      });
      await syncMerchantFromSubscription({ userId, status: sub.status, currentPeriodEnd: f.periodEnd });
      break;
    }
    case "customer.subscription.updated": {
      const f = fields(sub);
      const row = await updateSubscriptionRow(sub.id, env, {
        status: sub.status,
        product_id: f.productId,
        price_id: f.priceId,
        current_period_start: f.periodStart,
        current_period_end: f.periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      });
      const userId = row?.user_id ?? sub.metadata?.userId;
      if (userId) {
        // Annulation programmée : reste Pro jusqu'à la fin de période.
        await syncMerchantFromSubscription({ userId, status: sub.status, currentPeriodEnd: f.periodEnd });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const row = await updateSubscriptionRow(sub.id, env, {
        status: "canceled",
        updated_at: new Date().toISOString(),
      });
      const userId = row?.user_id ?? sub.metadata?.userId;
      // Abonnement terminé : repasse en Free.
      if (userId) await syncMerchantFromSubscription({ userId, status: "ended", currentPeriodEnd: null });
      break;
    }
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
