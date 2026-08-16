import { prisma } from "@/lib/db";
import { getPlanLimits, getPlans } from "@/lib/billing/plans";

type Bucket = number[];

const chatBuckets = new Map<string, Bucket>();

/**
 * Simple in-memory per-user chat rate limiter.
 * Limit depends on the user's billing plan.
 */
export async function assertChatRateLimit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planStatus: true },
  });
  const limits = getPlanLimits(user?.plan, user?.planStatus);
  const max = limits.chatPerHour;
  const freeLabel = getPlans().free.label;
  const paidLabel = getPlans().premium.label;

  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const previous = chatBuckets.get(userId) ?? [];
  const recent = previous.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= max) {
    throw new RateLimitError(
      `Chat rate limit reached (${max} messages/hour on ${limits.label}). ${
        limits.label === freeLabel
          ? `Upgrade to ${paidLabel} for a higher limit.`
          : "Try again later."
      }`,
    );
  }

  recent.push(now);
  chatBuckets.set(userId, recent);
}

export class RateLimitError extends Error {
  status = 429;

  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
