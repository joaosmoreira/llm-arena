import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/next";

// Initialized Arcjet security client
// In development without an ARCJET_KEY, rules default to DRY_RUN so local development works smoothly
const hasArcjetKey = Boolean(process.env.ARCJET_KEY);

export const aj = arcjet({
  key: process.env.ARCJET_KEY ?? "ajkey_dev_placeholder",
  rules: [
    // Shield protects against common attacks like SQL injection, XSS, and prompt injection
    shield({
      mode: hasArcjetKey ? "LIVE" : "DRY_RUN",
    }),
    // Detect and block automated scraping bots while allowing search engines
    detectBot({
      mode: hasArcjetKey ? "LIVE" : "DRY_RUN",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    // Token bucket rate limiter: 10 requests max burst, refills 5 tokens every 10 seconds
    tokenBucket({
      mode: hasArcjetKey ? "LIVE" : "DRY_RUN",
      refillRate: 5,
      interval: 10,
      capacity: 10,
    }),
  ],
});
