"use client";

import posthog from "posthog-js";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

let isPostHogInitialized = false;

function getPostHogConfig() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    return null;
  }

  return { key, host };
}

export function initPostHog() {
  if (typeof window === "undefined" || isPostHogInitialized) {
    return;
  }

  const config = getPostHogConfig();
  if (!config) {
    return;
  }

  posthog.init(config.key, {
    api_host: config.host,
    capture_pageview: false
  });

  isPostHogInitialized = true;
}

export function trackEvent(eventName: string, properties?: EventProperties) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isPostHogInitialized) {
    initPostHog();
  }

  if (!isPostHogInitialized) {
    return;
  }

  posthog.capture(eventName, properties);
}
