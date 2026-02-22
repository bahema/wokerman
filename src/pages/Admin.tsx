import { useMemo, useRef, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import BrandingEditor from "../components/admin/BrandingEditor";
import AccountSettingsEditor from "../components/admin/AccountSettingsEditor";
import AccountUploadsEditor from "../components/admin/AccountUploadsEditor";
import AnalyticsEditor from "../components/admin/AnalyticsEditor";
import AdsectionManEditor from "../components/admin/AdsectionManEditor";
import EmailAnalyticsEditor from "../components/admin/EmailAnalyticsEditor";
import EmailSenderEditor from "../components/admin/EmailSenderEditor";
import EditorShell from "../components/admin/EditorShell";
import FooterEditor from "../components/admin/FooterEditor";
import HeroEditor from "../components/admin/HeroEditor";
import Hero2Editor from "../components/admin/Hero2Editor";
import HomeUiEditor from "../components/admin/HomeUiEditor";
import IndustryManager from "../components/admin/IndustryManager";
import ProductManager from "../components/admin/ProductManager";
import PreDeployChecklistEditor from "../components/admin/PreDeployChecklistEditor";
import { type AdminSection } from "../components/admin/Sidebar";
import SocialLinksEditor from "../components/admin/SocialLinksEditor";
import SystemHealthEditor from "../components/admin/SystemHealthEditor";
import TestimonialManager from "../components/admin/TestimonialManager";
import TopBar from "../components/admin/TopBar";
import Drawer from "../components/admin/Drawer";
import ProductCard from "../components/ProductCard";
import {
  getAdminInitialContentAsync,
  getDraftContentAsync,
  publishContent,
  resetContentToDefaults,
  saveDraftContent
} from "../utils/adminStorage";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { useEffect } from "react";
import { defaultHealthPage, defaultHomeUi, defaultProductSections, defaultSiteContent } from "../data/siteData";
import { clearAuth } from "../utils/authTrust";
import { validateContentForSave } from "./adminValidation";
import { withBasePath } from "../utils/basePath";

const bossSectionByPath: Record<string, AdminSection> = {
  "/boss/pre-deploy-checklist": "pre-deploy-checklist",
  "/boss/system-health": "system-health",
  "/boss/email-analytics": "email-analytics",
  "/boss/email-sender": "email-sender",
  "/boss/hero-2": "hero-2",
  "/boss/products-supplements": "products-supplements",
  "/boss/products-gadgets": "products-gadgets",
  "/boss/adsection-man": "adsection-man",
  "/boss/account-settings": "account-settings"
};

const pathByBossSection: Partial<Record<AdminSection, string>> = {
  "pre-deploy-checklist": "/boss/pre-deploy-checklist",
  "system-health": "/boss/system-health",
  "email-analytics": "/boss/email-analytics",
  "email-sender": "/boss/email-sender",
  "hero-2": "/boss/hero-2",
  "products-supplements": "/boss/products-supplements",
  "products-gadgets": "/boss/products-gadgets",
  "adsection-man": "/boss/adsection-man",
  "account-settings": "/boss/account-settings"
};

const toCleanPath = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value);

const Admin = () => {
  const [content, setContent] = useState(defaultSiteContent);
  const [loadingContent, setLoadingContent] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>("branding");
  const [theme, setTheme] = useState<Theme>(() => {
    const preferred = defaultSiteContent.branding.defaultTheme;
    if (preferred === "light" || preferred === "dark") return preferred;
    return getInitialTheme();
  });
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [status, setStatus] = useState<"Draft" | "Published">("Published");
  const [isBusy, setIsBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const autoPublishTimerRef = useRef<number | null>(null);

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (autoPublishTimerRef.current !== null) {
        window.clearTimeout(autoPublishTimerRef.current);
      }
    };
  }, []);

  const saveProductSectionCopy = async (
    section: "forex" | "betting" | "software" | "social",
    nextCopy: { title: string; description: string }
  ) => {
    const currentSections = content.productSections ?? defaultProductSections;
    const nextContent = {
      ...content,
      productSections: {
        ...currentSections,
        [section]: nextCopy
      }
    };
    setContent(nextContent);
    await saveDraftContent(nextContent);
    await publishContent(nextContent);
    setStatus("Published");
    setActionMessage("Section copy updated and published.");
  };

  const saveHealthSectionCopy = async (
    section: "gadgets" | "supplements",
    nextCopy: { title: string; description: string }
  ) => {
    const currentHealth = resolveHealthPageContent();
    const nextContent = {
      ...content,
      healthPage: {
        ...currentHealth,
        sections: {
          ...currentHealth.sections,
          [section]: nextCopy
        }
      }
    };
    setContent(nextContent);
    await saveDraftContent(nextContent);
    await publishContent(nextContent);
    setStatus("Published");
    setActionMessage("Health section copy updated and published.");
  };

  useEffect(() => {
    const syncSectionFromPath = () => {
      const match = bossSectionByPath[toCleanPath(window.location.pathname)];
      if (match) {
        setActiveSection(match);
      }
    };
    syncSectionFromPath();
    window.addEventListener("popstate", syncSectionFromPath);
    return () => window.removeEventListener("popstate", syncSectionFromPath);
  }, []);

  const queueAutoPublish = (nextContent: typeof content, successMessage: string, fallbackErrorMessage: string) => {
    setContent(nextContent);
    setStatus("Draft");
    if (autoPublishTimerRef.current !== null) {
      window.clearTimeout(autoPublishTimerRef.current);
    }
    autoPublishTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          setActionError("");
          await saveDraftContent(nextContent);
          await publishContent(nextContent);
          setStatus("Published");
          setActionMessage(successMessage);
        } catch (error) {
          setActionError(error instanceof Error ? error.message : fallbackErrorMessage);
        }
      })();
    }, 500);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const initial = await getAdminInitialContentAsync();
        const draft = await getDraftContentAsync();
        if (!cancelled) {
          setContent(initial);
          setStatus(draft ? "Draft" : "Published");
        }
      } catch {
        if (!cancelled) {
          setContent(defaultSiteContent);
          setStatus("Published");
        }
      } finally {
        if (!cancelled) {
          setLoadingContent(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveHealthPageContent = () => ({
    ...defaultHealthPage,
    ...(content.healthPage ?? {}),
    hero2: {
      ...defaultHealthPage.hero2,
      ...(content.healthPage?.hero2 ?? {})
    },
    sections: {
      gadgets: {
        ...defaultHealthPage.sections.gadgets,
        ...(content.healthPage?.sections?.gadgets ?? {})
      },
      supplements: {
        ...defaultHealthPage.sections.supplements,
        ...(content.healthPage?.sections?.supplements ?? {})
      }
    },
    products: {
      gadgets: content.healthPage?.products?.gadgets ?? defaultHealthPage.products.gadgets,
      supplements: content.healthPage?.products?.supplements ?? defaultHealthPage.products.supplements
    }
  });

  const sectionNode = useMemo(() => {
    switch (activeSection) {
      case "pre-deploy-checklist":
        return (
          <EditorShell
            title="Pre-Deploy Checklist"
            description="Track release readiness tasks and deployment notes before going live."
          >
            <PreDeployChecklistEditor />
          </EditorShell>
        );
      case "system-health":
        return (
          <EditorShell title="System Health" description="Run quick local checks to ensure frontend and backend are ready.">
            <SystemHealthEditor />
          </EditorShell>
        );
      case "account-settings":
        return (
          <EditorShell title="Account Settings" description="Manage account-only profile and security preferences.">
            <AccountSettingsEditor />
          </EditorShell>
        );
      case "email-analytics":
        return (
          <EditorShell
            title="Email Analytics"
            description="Track campaign performance, subscriber lifecycle, and recent email activity."
          >
            <EmailAnalyticsEditor />
          </EditorShell>
        );
      case "email-sender":
        return (
          <EditorShell
            title="Email Sender"
            description="Compose campaigns, preview output, and manage scheduling controls."
          >
            <EmailSenderEditor />
          </EditorShell>
        );
      case "product-media":
        return (
          <EditorShell title="Product Media" description="Upload and manage images used by product cards.">
            <AccountUploadsEditor />
          </EditorShell>
        );
      case "analytics":
        return (
          <EditorShell title="Analytics" description="Overview metrics for content and product inventory.">
            <AnalyticsEditor content={content} />
          </EditorShell>
        );
      case "branding":
        return (
          <EditorShell title="Branding & Theme" description="Manage logo text, accent color and default theme.">
            <BrandingEditor
              value={content.branding}
              onChange={(next) => {
                const nextContent = { ...content, branding: next };
                queueAutoPublish(nextContent, "Branding updated and published.", "Failed to publish branding updates.");
              }}
            />
          </EditorShell>
        );
      case "social-links":
        return (
          <EditorShell title="Social Links" description="Primary links used by navbar popover and footer.">
            <SocialLinksEditor
              value={content.socials}
              onChange={(next) => {
                const nextContent = { ...content, socials: next };
                queueAutoPublish(nextContent, "Social links updated and published.", "Failed to publish social links updates.");
              }}
            />
          </EditorShell>
        );
      case "hero":
        return (
          <EditorShell title="Hero" description="Edit headline, supporting copy, CTA actions and stat chips.">
            <div className="space-y-4">
              <HeroEditor
                value={content.hero}
                onChange={(next) => {
                  const nextContent = { ...content, hero: next };
                  queueAutoPublish(nextContent, "Hero updated and published.", "Failed to publish hero updates.");
                }}
              />
              <HomeUiEditor
                value={content.homeUi ?? defaultHomeUi}
                onChange={(next) => {
                  const nextContent = { ...content, homeUi: next };
                  queueAutoPublish(nextContent, "Home UI copy updated and published.", "Failed to publish home UI copy updates.");
                }}
              />
            </div>
          </EditorShell>
        );
      case "hero-2":
        return (
          <EditorShell title="Hero 2" description="Configure the hero content for the Health page (UI scaffolding only).">
            <Hero2Editor
              value={resolveHealthPageContent().hero2}
              onChange={(next) => {
                const nextContent = {
                  ...content,
                  healthPage: {
                    ...resolveHealthPageContent(),
                    hero2: next
                  }
                };
                queueAutoPublish(nextContent, "Hero 2 updated and published.", "Failed to publish Hero 2 updates.");
              }}
            />
          </EditorShell>
        );
      case "adsection-man":
        return (
          <EditorShell
            title="Adsection Man"
            description="Control the two new hero-side ad boxes (top: Newer Gadgets, bottom: AI Update)."
          >
            <AdsectionManEditor
              value={{
                ...defaultHomeUi,
                ...(content.homeUi ?? {}),
                adsectionMan: {
                  ...defaultHomeUi.adsectionMan,
                  ...(content.homeUi?.adsectionMan ?? {}),
                  gadgets: {
                    ...defaultHomeUi.adsectionMan.gadgets,
                    ...(content.homeUi?.adsectionMan?.gadgets ?? {})
                  },
                  ai: {
                    ...defaultHomeUi.adsectionMan.ai,
                    ...(content.homeUi?.adsectionMan?.ai ?? {})
                  }
                }
              }}
              onSaveSection={async (box, nextSection) => {
                const nextHomeUi = {
                  ...defaultHomeUi,
                  ...(content.homeUi ?? {}),
                  adsectionMan: {
                    ...defaultHomeUi.adsectionMan,
                    ...(content.homeUi?.adsectionMan ?? {}),
                    [box]: nextSection
                  }
                };
                const nextContent = { ...content, homeUi: nextHomeUi };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage(`${box === "gadgets" ? "Top" : "Bottom"} ad box updated and published.`);
              }}
            />
          </EditorShell>
        );
      case "testimonials":
        return (
          <EditorShell title="Testimonials" description="Add, edit, duplicate, delete and reorder testimonial cards.">
            <TestimonialManager
              items={content.testimonials}
              onChange={(next) => {
                const nextContent = { ...content, testimonials: next };
                setContent(nextContent);
                void (async () => {
                  try {
                    setActionError("");
                    await saveDraftContent(nextContent);
                    await publishContent(nextContent);
                    setStatus("Published");
                    setActionMessage("Testimonials updated and published.");
                  } catch (error) {
                    setActionError(error instanceof Error ? error.message : "Failed to publish testimonial updates.");
                  }
                })();
              }}
            />
          </EditorShell>
        );
      case "industries":
        return (
          <EditorShell title="Industries Slider" description="Manage labels/icons shown in the moving industry strip.">
            <IndustryManager
              items={content.industries}
              onChange={(next) => {
                const nextContent = { ...content, industries: next };
                setContent(nextContent);
                void (async () => {
                  try {
                    setActionError("");
                    await saveDraftContent(nextContent);
                    await publishContent(nextContent);
                    setStatus("Published");
                    setActionMessage("Industries updated and published.");
                  } catch (error) {
                    setActionError(error instanceof Error ? error.message : "Failed to publish industry updates.");
                  }
                })();
              }}
            />
          </EditorShell>
        );
      case "footer":
        return (
          <EditorShell title="Footer" description="Manage footer note and copyright text.">
            <FooterEditor
              value={content.footer}
              onChange={(next) => {
                const nextContent = { ...content, footer: next };
                queueAutoPublish(nextContent, "Footer updated and published.", "Failed to publish footer updates.");
              }}
            />
          </EditorShell>
        );
      case "products-forex":
        return (
          <EditorShell title="Forex Products" description="Manage forex product cards for homepage section.">
            <ProductManager
              title="Forex Products"
              category="Forex"
              items={content.products.forex}
              sectionTitle={(content.productSections ?? defaultProductSections).forex.title}
              sectionDescription={(content.productSections ?? defaultProductSections).forex.description}
              onSectionCopySave={(next) => saveProductSectionCopy("forex", next)}
              onChange={(next) => setContent((prev) => ({ ...prev, products: { ...prev.products, forex: next } }))}
              onSaveAndPublish={async (nextItems) => {
                const nextContent = { ...content, products: { ...content.products, forex: nextItems } };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage("Product saved and published.");
              }}
              onPreviewDraft={(nextItems) => {
                const nextContent = { ...content, products: { ...content.products, forex: nextItems } };
                setContent(nextContent);
                void (async () => {
                  await saveDraftContent(nextContent);
                  setStatus("Draft");
                  window.open(withBasePath("/?preview=draft"), "_blank", "noopener,noreferrer");
                })();
              }}
            />
          </EditorShell>
        );
      case "products-betting":
        return (
          <EditorShell title="Betting Products" description="Manage betting product cards.">
            <ProductManager
              title="Betting Products"
              category="Betting"
              items={content.products.betting}
              sectionTitle={(content.productSections ?? defaultProductSections).betting.title}
              sectionDescription={(content.productSections ?? defaultProductSections).betting.description}
              onSectionCopySave={(next) => saveProductSectionCopy("betting", next)}
              onChange={(next) => setContent((prev) => ({ ...prev, products: { ...prev.products, betting: next } }))}
              onSaveAndPublish={async (nextItems) => {
                const nextContent = { ...content, products: { ...content.products, betting: nextItems } };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage("Product saved and published.");
              }}
              onPreviewDraft={(nextItems) => {
                const nextContent = { ...content, products: { ...content.products, betting: nextItems } };
                setContent(nextContent);
                void (async () => {
                  await saveDraftContent(nextContent);
                  setStatus("Draft");
                  window.open(withBasePath("/?preview=draft"), "_blank", "noopener,noreferrer");
                })();
              }}
            />
          </EditorShell>
        );
      case "products-software":
        return (
          <EditorShell title="New Released Software" description="Manage software release cards.">
            <ProductManager
              title="Software Products"
              category="Software"
              items={content.products.software}
              sectionTitle={(content.productSections ?? defaultProductSections).software.title}
              sectionDescription={(content.productSections ?? defaultProductSections).software.description}
              onSectionCopySave={(next) => saveProductSectionCopy("software", next)}
              onChange={(next) => setContent((prev) => ({ ...prev, products: { ...prev.products, software: next } }))}
              onSaveAndPublish={async (nextItems) => {
                const nextContent = { ...content, products: { ...content.products, software: nextItems } };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage("Product saved and published.");
              }}
              onPreviewDraft={(nextItems) => {
                const nextContent = { ...content, products: { ...content.products, software: nextItems } };
                setContent(nextContent);
                void (async () => {
                  await saveDraftContent(nextContent);
                  setStatus("Draft");
                  window.open(withBasePath("/?preview=draft"), "_blank", "noopener,noreferrer");
                })();
              }}
            />
          </EditorShell>
        );
      case "products-social":
        return (
          <EditorShell title="Social Automation Products" description="Manage social automation product cards.">
            <ProductManager
              title="Social Products"
              category="Social"
              items={content.products.social}
              sectionTitle={(content.productSections ?? defaultProductSections).social.title}
              sectionDescription={(content.productSections ?? defaultProductSections).social.description}
              onSectionCopySave={(next) => saveProductSectionCopy("social", next)}
              onChange={(next) => setContent((prev) => ({ ...prev, products: { ...prev.products, social: next } }))}
              onSaveAndPublish={async (nextItems) => {
                const nextContent = { ...content, products: { ...content.products, social: nextItems } };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage("Product saved and published.");
              }}
              onPreviewDraft={(nextItems) => {
                const nextContent = { ...content, products: { ...content.products, social: nextItems } };
                setContent(nextContent);
                void (async () => {
                  await saveDraftContent(nextContent);
                  setStatus("Draft");
                  window.open(withBasePath("/?preview=draft"), "_blank", "noopener,noreferrer");
                })();
              }}
            />
          </EditorShell>
        );
      case "products-supplements":
        return (
          <EditorShell title="Supplements" description="Manage health supplements with the same flow as main product sections.">
            <ProductManager
              title="Supplements Products"
              category="Supplements"
              items={resolveHealthPageContent().products.supplements}
              sectionTitle={resolveHealthPageContent().sections.supplements.title}
              sectionDescription={resolveHealthPageContent().sections.supplements.description}
              onSectionCopySave={(next) => saveHealthSectionCopy("supplements", next)}
              onChange={(next) => {
                const current = resolveHealthPageContent();
                setContent((prev) => ({
                  ...prev,
                  healthPage: {
                    ...current,
                    products: {
                      ...current.products,
                      supplements: next
                    }
                  }
                }));
              }}
              onSaveAndPublish={async (nextItems) => {
                const current = resolveHealthPageContent();
                const nextContent = {
                  ...content,
                  healthPage: {
                    ...current,
                    products: {
                      ...current.products,
                      supplements: nextItems
                    }
                  }
                };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage("Supplements products saved and published.");
              }}
              onPreviewDraft={(nextItems) => {
                const current = resolveHealthPageContent();
                const nextContent = {
                  ...content,
                  healthPage: {
                    ...current,
                    products: {
                      ...current.products,
                      supplements: nextItems
                    }
                  }
                };
                setContent(nextContent);
                void (async () => {
                  await saveDraftContent(nextContent);
                  setStatus("Draft");
                  window.open(withBasePath("/health?preview=draft"), "_blank", "noopener,noreferrer");
                })();
              }}
            />
          </EditorShell>
        );
      case "products-gadgets":
        return (
          <EditorShell title="Gadgets" description="Manage healthy gadgets with the same flow as main product sections.">
            <ProductManager
              title="Gadgets Products"
              category="Gadgets"
              items={resolveHealthPageContent().products.gadgets}
              sectionTitle={resolveHealthPageContent().sections.gadgets.title}
              sectionDescription={resolveHealthPageContent().sections.gadgets.description}
              onSectionCopySave={(next) => saveHealthSectionCopy("gadgets", next)}
              onChange={(next) => {
                const current = resolveHealthPageContent();
                setContent((prev) => ({
                  ...prev,
                  healthPage: {
                    ...current,
                    products: {
                      ...current.products,
                      gadgets: next
                    }
                  }
                }));
              }}
              onSaveAndPublish={async (nextItems) => {
                const current = resolveHealthPageContent();
                const nextContent = {
                  ...content,
                  healthPage: {
                    ...current,
                    products: {
                      ...current.products,
                      gadgets: nextItems
                    }
                  }
                };
                setContent(nextContent);
                await saveDraftContent(nextContent);
                await publishContent(nextContent);
                setStatus("Published");
                setActionMessage("Gadgets products saved and published.");
              }}
              onPreviewDraft={(nextItems) => {
                const current = resolveHealthPageContent();
                const nextContent = {
                  ...content,
                  healthPage: {
                    ...current,
                    products: {
                      ...current.products,
                      gadgets: nextItems
                    }
                  }
                };
                setContent(nextContent);
                void (async () => {
                  await saveDraftContent(nextContent);
                  setStatus("Draft");
                  window.open(withBasePath("/health?preview=draft"), "_blank", "noopener,noreferrer");
                })();
              }}
            />
          </EditorShell>
        );
      default:
        return null;
    }
  }, [activeSection, content]);

  if (loadingContent) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="max-w-[1600px] mx-auto px-4 py-10">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Loading admin content...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute -left-28 top-14 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-900/20" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />
      <TopBar
        status={status}
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        previewPaneOpen={previewEnabled}
        onTogglePreviewPane={() => setPreviewEnabled((prev) => !prev)}
        isBusy={isBusy}
        onSaveDraft={() => {
          void (async () => {
            try {
              setIsBusy(true);
              setActionError("");
              const validationError = validateContentForSave(content);
              if (validationError) {
                setActionError(validationError);
                return;
              }
              const saved = await saveDraftContent(content);
              setContent(saved);
              setStatus("Draft");
              setActionMessage("Draft saved.");
            } catch (error) {
              setActionError(error instanceof Error ? error.message : "Failed to save draft.");
            } finally {
              setIsBusy(false);
            }
          })();
        }}
        onPublish={() => {
          void (async () => {
            try {
              setIsBusy(true);
              setActionError("");
              const validationError = validateContentForSave(content);
              if (validationError) {
                setActionError(validationError);
                return;
              }
              const published = await publishContent(content);
              setContent(published);
              setStatus("Published");
              setActionMessage("Published successfully.");
            } catch (error) {
              setActionError(error instanceof Error ? error.message : "Failed to publish.");
            } finally {
              setIsBusy(false);
            }
          })();
        }}
        onReset={() => {
          void (async () => {
            try {
              setIsBusy(true);
              setActionError("");
              const reset = await resetContentToDefaults();
              setContent(reset);
              setStatus("Published");
              setActionMessage("Content reset to defaults.");
            } catch (error) {
              setActionError(error instanceof Error ? error.message : "Failed to reset.");
            } finally {
              setIsBusy(false);
            }
          })();
        }}
        onLogout={() => {
          void (async () => {
            try {
              setIsBusy(true);
              setActionError("");
              await clearAuth();
              window.history.pushState({}, "", "/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            } catch (error) {
              setActionError(error instanceof Error ? error.message : "Failed to logout.");
            } finally {
              setIsBusy(false);
            }
          })();
        }}
      />
      {actionError ? (
        <div className="max-w-[1600px] mx-auto px-4 pt-3">
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            {actionError}
          </div>
        </div>
      ) : null}
      {!actionError && actionMessage ? (
        <div className="max-w-[1600px] mx-auto px-4 pt-3">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {actionMessage}
          </div>
        </div>
      ) : null}
      <AdminLayout
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          const nextPath = pathByBossSection[section] ?? "/admin";
          const browserPath = withBasePath(nextPath);
          if (window.location.pathname !== browserPath) {
            window.history.pushState({}, "", browserPath);
          }
        }}
      >
        {sectionNode}
      </AdminLayout>
      <Drawer title="Mini Preview" open={previewEnabled} onClose={() => setPreviewEnabled(false)}>
        <div className="space-y-3">
          <p className="text-sm font-semibold">{content.hero.headline}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{content.hero.subtext}</p>
          {content.products.forex[0] ? (
            <ProductCard
              product={content.products.forex[0]}
              onCheckout={() => {
                // preview only
              }}
              onMoreInfo={() => {
                // preview only
              }}
            />
          ) : null}
        </div>
      </Drawer>
    </div>
  );
};

export default Admin;
