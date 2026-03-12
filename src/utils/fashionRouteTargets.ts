export const FASHION_ROUTE_TARGETS = ["/fashion", "/fashion/collections", "/fashion/editorial", "/fashion/style-notes"] as const;

export type FashionRouteTarget = (typeof FASHION_ROUTE_TARGETS)[number];

export const isFashionRouteTarget = (value: string): value is FashionRouteTarget =>
  FASHION_ROUTE_TARGETS.includes(value as FashionRouteTarget);

export const resolveFashionRouteTarget = (value: string | undefined, fallback: FashionRouteTarget): FashionRouteTarget => {
  const trimmed = value?.trim() ?? "";
  if (trimmed && isFashionRouteTarget(trimmed)) {
    return trimmed;
  }
  return fallback;
};
