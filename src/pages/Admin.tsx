import { useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import BrandingEditor from "../components/admin/BrandingEditor";
import AccountSettingsEditor from "../components/admin/AccountSettingsEditor";
import AccountUploadsEditor from "../components/admin/AccountUploadsEditor";
import AnalyticsEditor from "../components/admin/AnalyticsEditor";
import EditorShell from "../components/admin/EditorShell";
import FooterEditor from "../components/admin/FooterEditor";
import HeroEditor from "../components/admin/HeroEditor";
import IndustryManager from "../components/admin/IndustryManager";
import ProductManager from "../components/admin/ProductManager";
import { type AdminSection } from "../components/admin/Sidebar";
import SocialLinksEditor from "../components/admin/SocialLinksEditor";
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
import { defaultSiteContent } from "../data/siteData";
import { clearAuth } from "../utils/authTrust";
import { validateContentForSave } from "./adminValidation";

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

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

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

  const sectionNode = useMemo(() => {
    switch (activeSection) {
      case "account-settings":
        return (
          <EditorShell title="Account Settings" description="Manage account-only profile and security preferences.">
            <AccountSettingsEditor />
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
            <BrandingEditor value={content.branding} onChange={(next) => setContent((prev) => ({ ...prev, branding: next }))} />
          </EditorShell>
        );
      case "social-links":
        return (
          <EditorShell title="Social Links" description="Primary links used by navbar popover and footer.">
            <SocialLinksEditor value={content.socials} onChange={(next) => setContent((prev) => ({ ...prev, socials: next }))} />
          </EditorShell>
        );
      case "hero":
        return (
          <EditorShell title="Hero" description="Edit headline, supporting copy, CTA actions and stat chips.">
            <HeroEditor value={content.hero} onChange={(next) => setContent((prev) => ({ ...prev, hero: next }))} />
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
            <FooterEditor value={content.footer} onChange={(next) => setContent((prev) => ({ ...prev, footer: next }))} />
          </EditorShell>
        );
      case "products-forex":
        return (
          <EditorShell title="Forex Products" description="Manage forex product cards for homepage section.">
            <ProductManager
              title="Forex Products"
              category="Forex"
              items={content.products.forex}
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
                  window.open("/?preview=draft", "_blank", "noopener,noreferrer");
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
                  window.open("/?preview=draft", "_blank", "noopener,noreferrer");
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
                  window.open("/?preview=draft", "_blank", "noopener,noreferrer");
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
                  window.open("/?preview=draft", "_blank", "noopener,noreferrer");
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
              window.history.pushState({}, "", "/signup");
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
      <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
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
