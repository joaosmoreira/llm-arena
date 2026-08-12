"use client";

import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

export function PostHogAuthSync() {
  const { user, isLoaded } = useUser();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      return;
    }

    if (identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      username: user.username,
      name: user.fullName,
    });
    identifiedUserId.current = user.id;
  }, [isLoaded, user]);

  return null;
}
