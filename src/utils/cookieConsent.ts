export const COOKIE_CONSENT_KEY = "cookieConsent";
export const COOKIE_CONSENT_ID_KEY = "cookieConsentId";
export const COOKIE_CONSENT_VERSION = 1;
export const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";

export type CookieConsent = {
  version: number;
  updatedAt: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

export const getDefaultCookieConsent = (): CookieConsent => ({
  version: COOKIE_CONSENT_VERSION,
  updatedAt: new Date().toISOString(),
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false
});

export const readCookieConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      preferences: Boolean(parsed.preferences)
    };
  } catch {
    return null;
  }
};

export const saveCookieConsent = (consent: Omit<CookieConsent, "version" | "updatedAt" | "essential"> & { essential?: true }) => {
  const next: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    essential: true,
    analytics: Boolean(consent.analytics),
    marketing: Boolean(consent.marketing),
    preferences: Boolean(consent.preferences)
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  } catch {
    // Keep UI functional even when storage is blocked (private mode / browser policy).
  }
  return next;
};

const buildConsentId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `consent-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateCookieConsentId = () => {
  try {
    const existing = localStorage.getItem(COOKIE_CONSENT_ID_KEY);
    if (existing && existing.trim()) return existing.trim().toLowerCase();
    const next = buildConsentId().toLowerCase();
    localStorage.setItem(COOKIE_CONSENT_ID_KEY, next);
    return next;
  } catch {
    return buildConsentId().toLowerCase();
  }
};

export const hasValidCookieConsent = () => readCookieConsent() !== null;

export const shouldLoadAnalytics = (consent: CookieConsent | null) => Boolean(consent?.analytics);
export const shouldLoadMarketing = (consent: CookieConsent | null) => Boolean(consent?.marketing);
