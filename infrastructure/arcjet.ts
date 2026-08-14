import arcjet, { shield } from "@arcjet/next";
import { env } from "@/lib/env";

// Base Arcjet client with shield protection against common attacks
export const aj = arcjet({
  key: env.ARCJET_KEY ?? "",
  rules: [
    shield({
      mode: "LIVE",
    }),
  ],
});
