import posthog from "posthog-js";
import { env } from "@/lib/env";

const projectToken = env.NEXT_PUBLIC_POSTHOG_KEY;
const host = env.NEXT_PUBLIC_POSTHOG_HOST;

if (projectToken && host && typeof window !== "undefined") {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    disable_session_recording: env.isDevelopment,
    autocapture: !env.isDevelopment,
    debug: false,
  });
}
