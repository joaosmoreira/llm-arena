import { auth } from "@clerk/nextjs/server";
import { env } from "@/lib/env";

/**
 * Centralized development fallback identity for unauthenticated local workflows.
 */
export const DEV_USER_ID = "cmss98a790000tis7rvxgthkw";

/**
 * Resolves the authenticated Clerk userId, or falls back to the shared DEV_USER_ID in development mode.
 * Returns null if unauthenticated in production.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId || (env.isDevelopment ? DEV_USER_ID : null);
}
