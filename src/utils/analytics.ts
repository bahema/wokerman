import { apiJson } from "../api/client";

type AnalyticsPayload = Record<string, unknown>;

export const trackAnalyticsEvent = (eventName: string, payload: AnalyticsPayload = {}) => {
  if (!eventName.trim()) return;
  void apiJson<{ item: unknown }>("/api/analytics/events", "POST", {
    eventName,
    payload: {
      ...payload,
      clientTs: new Date().toISOString()
    }
  }).catch(() => {
    // Analytics must never block user interactions.
  });
};

