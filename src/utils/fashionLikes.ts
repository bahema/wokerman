import { apiJson } from "../api/client";

export type FashionLikeScope = "homepage" | "editorial";

type SlideSeed = {
  id: string;
  seedLikes?: number;
};

const CLIENT_KEY_STORAGE = "autohub:fashion:likes:client-key";

const resolveClientLikeId = () => {
  if (typeof window === "undefined") return "client-server";
  const existing = window.localStorage.getItem(CLIENT_KEY_STORAGE)?.trim();
  if (existing) return existing;
  const generatedRaw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const generated = `client-${generatedRaw.replace(/[^a-z0-9_-]+/gi, "").toLowerCase().slice(0, 40)}`;
  window.localStorage.setItem(CLIENT_KEY_STORAGE, generated);
  return generated;
};

export const getFashionLikesSummary = async (scope: FashionLikeScope, slides: SlideSeed[]) => {
  return apiJson<{ counts: Record<string, number>; liked: Record<string, boolean> }>(
    "/api/fashion/likes/summary",
    "POST",
    {
      scope,
      clientId: resolveClientLikeId(),
      slides
    }
  );
};

export const toggleFashionLike = async (scope: FashionLikeScope, slideId: string, seedLikes = 0) => {
  return apiJson<{ count: number; liked: boolean }>("/api/fashion/likes/toggle", "POST", {
    scope,
    clientId: resolveClientLikeId(),
    slideId,
    seedLikes
  });
};
