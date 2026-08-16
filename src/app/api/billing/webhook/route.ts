import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import {
  handleCheckoutSessionCompleted,
  markUserSubscriptionCanceled,
  syncSubscriptionFromStripe,
} from "@/lib/billing/webhook-handlers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return Response.json(
      { error: "Missing Stripe webhook configuration." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe] signature verification failed", error);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleCheckoutSessionCompleted(session);
          if (typeof session.subscription === "string") {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription,
            );
            await syncSubscriptionFromStripe(subscription);
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscriptionFromStripe(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId =
          subscription.metadata?.userId ||
          (
            await prisma.user.findFirst({
              where: {
                OR: [
                  { stripeSubscriptionId: subscription.id },
                  {
                    stripeCustomerId:
                      typeof subscription.customer === "string"
                        ? subscription.customer
                        : undefined,
                  },
                ],
              },
              select: { id: true },
            })
          )?.id;

        if (userId) {
          await markUserSubscriptionCanceled(userId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : null;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { planStatus: "past_due" },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe] webhook handler error", event.type, error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
