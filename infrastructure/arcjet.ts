import arcjet, { shield } from "@arcjet/next";

// Base Arcjet client with shield protection against common attacks
export const aj = arcjet({
  key: process.env.ARCJET_KEY ?? "",
  rules: [
    shield({
      mode: "LIVE",
    }),
  ],
});
