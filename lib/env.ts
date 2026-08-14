import { z } from "zod";
import dotenv from "dotenv";

if (typeof window === "undefined") {
  dotenv.config({ path: [".env.local", ".env"] });
}

const serverEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .optional()
    .default("postgresql://localhost:5432/llm_arena"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required").optional(),
  ARCJET_KEY: z.string().min(1, "ARCJET_KEY is required").optional(),
  POSTHOG_API_KEY: z.string().min(1, "POSTHOG_API_KEY is required").optional(),
  POSTHOG_HOST: z.string().url().optional().default("https://us.i.posthog.com"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required")
    .optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1, "NEXT_PUBLIC_POSTHOG_KEY is required").optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional().default("https://us.i.posthog.com"),
});

function validateEnv() {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const parsedServer = serverEnvSchema.safeParse(process.env);
    if (!parsedServer.success) {
      const formattedErrors = parsedServer.error.flatten().fieldErrors;
      const errorSummary = Object.entries(formattedErrors)
        .map(([key, errors]) => `  - ${key}: ${errors?.join(", ")}`)
        .join("\n");

      console.warn(
        `[Environment Warning] Missing or invalid server environment variables:\n${errorSummary}`
      );
    }
  }

  const parsedClient = clientEnvSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });

  if (!parsedClient.success) {
    const formattedErrors = parsedClient.error.flatten().fieldErrors;
    const errorSummary = Object.entries(formattedErrors)
      .map(([key, errors]) => `  - ${key}: ${errors?.join(", ")}`)
      .join("\n");

    console.warn(
      `[Environment Warning] Missing or invalid client environment variables:\n${errorSummary}`
    );
  }
}

// Run validation at module import
validateEnv();

export const env = {
  get OPENROUTER_API_KEY(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error(
        "Missing OPENROUTER_API_KEY environment variable. Please set it in your .env.local file."
      );
    }
    return key;
  },
  get DATABASE_URL(): string {
    return process.env.DATABASE_URL || "postgresql://localhost:5432/llm_arena";
  },
  get CLERK_SECRET_KEY(): string | undefined {
    return process.env.CLERK_SECRET_KEY;
  },
  get ARCJET_KEY(): string | undefined {
    return process.env.ARCJET_KEY;
  },
  get POSTHOG_API_KEY(): string | undefined {
    return process.env.POSTHOG_API_KEY;
  },
  get POSTHOG_HOST(): string {
    return process.env.POSTHOG_HOST || "https://us.i.posthog.com";
  },
  get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY(): string | undefined {
    return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  },
  get NEXT_PUBLIC_POSTHOG_KEY(): string | undefined {
    return process.env.NEXT_PUBLIC_POSTHOG_KEY;
  },
  get NEXT_PUBLIC_POSTHOG_HOST(): string {
    return process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV || "development";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  },
} as const;
