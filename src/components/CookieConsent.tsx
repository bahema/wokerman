import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "../utils/basePath";
import { apiJson } from "../api/client";
import {
  getDefaultCookieConsent,
  getOrCreateCookieConsentId,
  OPEN_COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsent
} from "../utils/cookieConsent";

type ConsentDraft = Pick<CookieConsent, "analytics" | "marketing" | "preferences">;
const COOKIE_BANNER_APPEAR_DELAY_MS = 180000;

const Toggle = ({
  value,
  disabled,
  onChange
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) => (
  <button
    type="button"
    aria-pressed={value}
    disabled={disabled}
    onClick={() => onChange(!value)}
    className={`relative h-10 w-14 rounded-full transition ${
      value ? "bg-blue-600" : "bg-white/15"
    } ${disabled ? "cursor-not-allowed opacity-70" : "hover:brightness-110"}`}
  >
    <span
      className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition ${
        value ? "left-5" : "left-1"
      }`}
    />
  </button>
);

const CookieConsent = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentDraft>({ analytics: false, marketing: false, preferences: false });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    const stored = readCookieConsent();
    if (stored) {
      setDraft({
        analytics: stored.analytics,
        marketing: stored.marketing,
        preferences: stored.preferences
      });
      setShowBanner(false);
      return;
    }

    let timer: number | null = null;
    const startBannerTimer = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        if (!readCookieConsent()) setShowBanner(true);
      }, COOKIE_BANNER_APPEAR_DELAY_MS);
    };

    const onLoaded = () => startBannerTimer();

    if (document.readyState === "complete") {
      startBannerTimer();
    } else {
      window.addEventListener("load", onLoaded, { once: true });
    }

    return () => {
      window.removeEventListener("load", onLoaded);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [hasMounted]);

  useEffect(() => {
    const onOpen = () => {
      const stored = readCookieConsent() ?? getDefaultCookieConsent();
      setDraft({
        analytics: stored.analytics,
        marketing: stored.marketing,
        preferences: stored.preferences
      });
      setModalOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  const persistToBackend = async (next: CookieConsent, source: "accept_all" | "reject_non_essential" | "save_preferences") => {
    try {
      await apiJson<{ ok: boolean }>("/api/cookies/consent", "POST", {
        consentId: getOrCreateCookieConsentId(),
        version: next.version,
        essential: true,
        analytics: next.analytics,
        marketing: next.marketing,
        preferences: next.preferences,
        source
      });
    } catch (error) {
      console.warn("Cookie consent backend sync failed:", error);
    }
  };

  const applyConsent = async (
    next: ConsentDraft,
    source: "accept_all" | "reject_non_essential" | "save_preferences"
  ) => {
    const saved = saveCookieConsent(next);
    setDraft(next);
    setShowBanner(false);
    setModalOpen(false);
    await persistToBackend(saved, source);
  };

  const acceptAll = () => {
    void applyConsent({ analytics: true, marketing: true, preferences: true }, "accept_all");
  };

  const rejectNonEssential = () => {
    void applyConsent({ analytics: false, marketing: false, preferences: false }, "reject_non_essential");
  };

  const savePreferences = () => {
    void applyConsent(draft, "save_preferences");
  };

  const categories = useMemo(
    () => [
      {
        key: "essential" as const,
        title: "Essential",
        desc: "Required for core site functionality and security.",
        enabled: true,
        required: true
      },
      {
        key: "analytics" as const,
        title: "Analytics",
        desc: "Helps us understand usage and improve experience.",
        enabled: draft.analytics
      },
      {
        key: "marketing" as const,
        title: "Marketing",
        desc: "Used to personalize campaigns and promotions.",
        enabled: draft.marketing
      },
      {
        key: "preferences" as const,
        title: "Preferences",
        desc: "Remembers selected options for a smoother experience.",
        enabled: draft.preferences
      }
    ],
    [draft]
  );

  const showAny = showBanner || modalOpen;

  if (!hasMounted) return null;
  if (!showAny) return null;

  return (
    <>
      {showBanner ? (
        <div className="fixed bottom-3 left-3 right-3 z-[1000] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[720px] rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-5">
            <h3 className="text-base font-semibold text-white">We use cookies</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              We use essential cookies and optional cookies to improve performance and experience.{" "}
              <a href={withBasePath("/privacy")} className="underline underline-offset-4 transition hover:text-white">
                Privacy Policy
              </a>
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={acceptAll}
                className="h-11 w-full rounded-xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-500 sm:w-auto"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="h-11 w-full rounded-xl bg-white/10 px-4 font-semibold text-white transition hover:bg-white/15 sm:w-auto"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="h-11 w-full rounded-xl border border-white/10 bg-transparent px-4 font-semibold text-white/90 transition hover:bg-white/5 sm:w-auto"
              >
                Customize
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cookie preferences"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[calc(100vh-2rem)] w-[min(560px,92vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-md"
          >
            <header className="sticky top-0 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <h3 className="font-semibold text-white">Cookie preferences</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
                className="h-10 w-10 rounded-xl bg-white/5 text-white transition hover:bg-white/10"
              >
                ×
              </button>
            </header>

            <section className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {categories.map((category) => (
                <article key={category.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{category.title}</p>
                        {category.required ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">Required</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-white/60">{category.desc}</p>
                    </div>
                    {category.key === "essential" ? (
                      <Toggle value disabled onChange={() => undefined} />
                    ) : (
                      <Toggle
                        value={category.enabled}
                        onChange={(next) => setDraft((prev) => ({ ...prev, [category.key]: next }))}
                      />
                    )}
                  </div>
                </article>
              ))}
            </section>

            <footer className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <button
                type="button"
                onClick={savePreferences}
                className="h-11 rounded-xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-500"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="h-11 rounded-xl bg-white/10 px-4 font-semibold text-white transition hover:bg-white/15"
              >
                Accept all
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CookieConsent;
