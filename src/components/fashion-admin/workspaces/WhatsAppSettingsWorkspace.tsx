import { FashionAdminValidationPanel } from "../primitives";
import { formatAdminTime } from "../../../utils/adminTime";
import type { FashionInquiryAdminRecord, FashionInquiryAdminUpdatePayload } from "../../../utils/fashionInquiryAdmin";
import type { FashionBossDraft } from "../../../utils/fashionDraft";
import type { FashionWhatsAppApiSettings } from "../../../utils/fashionWhatsAppApi";
import { buildWhatsAppPreviewMessages } from "../../../utils/fashionWhatsApp";
import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

type DraftSection = "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp";
type PatchDraft = <K extends DraftSection>(section: K, value: Partial<FashionBossDraft[K]>) => void;

type WhatsAppSettingsWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  draft: FashionBossDraft;
  setSelectedWhatsAppPanel: (panel: "templates" | "preview" | "destination" | "inquiries") => void;
  selectedWhatsAppPanel: "templates" | "preview" | "destination" | "inquiries";
  patchDraft: PatchDraft;
  whatsAppApiSettings: FashionWhatsAppApiSettings;
  setWhatsAppApiSettings: Dispatch<SetStateAction<FashionWhatsAppApiSettings>>;
  saveWhatsAppApiSettings: () => Promise<void>;
  isSavingWhatsAppApi: boolean;
  recentInquiries: FashionInquiryAdminRecord[];
  updateInquiry: (id: string, patch: FashionInquiryAdminUpdatePayload) => Promise<void>;
  deleteInquiry: (id: string) => Promise<void>;
  isMutatingInquiry: boolean;
};

const defaultWhatsAppTemplateValues: Pick<
  FashionBossDraft["whatsapp"],
  | "productCta"
  | "fitCta"
  | "lookCta"
  | "storyCta"
  | "generalMessageTemplate"
  | "productMessageTemplate"
  | "fitMessageTemplate"
  | "lookMessageTemplate"
  | "pairMessageTemplate"
  | "storyMessageTemplate"
> = {
  productCta: "Order on WhatsApp",
  fitCta: "Ask about size",
  lookCta: "Send this look on WhatsApp",
  storyCta: "Shop this story on WhatsApp",
  generalMessageTemplate: "Hello, I want help with your fashion selections.\n{{disclaimer}}",
  productMessageTemplate:
    "{{product_note}}\nReference total: {{reference_total}}.\nPrice: {{price}}.\nCollection: {{collection}}.\nCategory: {{category}}.\nImage preview: {{image_link}}.\nProduct link: {{product_link}}.\nTone: {{tone}}.\nOccasion: {{occasion}}.\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
  fitMessageTemplate:
    "Hello, I need fit and sizing guidance for {{product_name}}.\nReference total: {{reference_total}}.\nPrice: {{price}}.\nCollection: {{collection}}.\nFit: {{fit}}.\nOccasion: {{occasion}}.\nImage preview: {{image_link}}.\nProduct link: {{product_link}}.\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
  lookMessageTemplate:
    "Hello, I want this look: {{title}}.\nReference total: {{total_price}}.\nItems:\n{{items_summary}}\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
  pairMessageTemplate:
    "Hello, I want to order {{lead_product}} with these paired items.\nReference total: {{total_price}}.\nLead item: {{lead_product}}.\nLead image preview: {{lead_image_link}}.\nSelected pairings:\n{{items_summary}}\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
  storyMessageTemplate:
    "Hello, I want this story set: {{title}}.\nReference total: {{total_price}}.\nItems:\n{{items_summary}}\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}."
};

const defaultWhatsAppDestinationValues: Pick<FashionBossDraft["whatsapp"], "phoneNumber" | "disclaimer"> = {
  phoneNumber: "",
  disclaimer: "All orders and inquiries are handled directly by the client on WhatsApp."
};

const inquiryStatusOptions: Array<FashionInquiryAdminRecord["status"]> = [
  "queued",
  "api-image",
  "api-text",
  "fallback-required",
  "failed"
];

const WhatsAppSettingsWorkspace = ({
  renderSectionActionBar,
  draft,
  setSelectedWhatsAppPanel,
  selectedWhatsAppPanel,
  patchDraft,
  whatsAppApiSettings,
  setWhatsAppApiSettings,
  saveWhatsAppApiSettings,
  isSavingWhatsAppApi,
  recentInquiries,
  updateInquiry,
  deleteInquiry,
  isMutatingInquiry
}: WhatsAppSettingsWorkspaceProps) => {
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [editingSource, setEditingSource] = useState("");
  const [editingStatus, setEditingStatus] = useState<FashionInquiryAdminRecord["status"]>("queued");
  const [editingPhone, setEditingPhone] = useState("");

  const editingRecord = useMemo(
    () => recentInquiries.find((item) => item.id === editingInquiryId) ?? null,
    [editingInquiryId, recentInquiries]
  );
  const previewMessages = useMemo(() => buildWhatsAppPreviewMessages(draft.whatsapp), [draft.whatsapp]);

  const startEditInquiry = (record: FashionInquiryAdminRecord) => {
    setEditingInquiryId(record.id);
    setEditingMessage(record.message);
    setEditingSource(record.source);
    setEditingStatus(record.status);
    setEditingPhone(record.customerMeta?.phoneNumber ?? "");
  };

  const cancelEditInquiry = () => {
    setEditingInquiryId(null);
    setEditingMessage("");
    setEditingSource("");
    setEditingStatus("queued");
    setEditingPhone("");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]">
    <div className="space-y-5">
      {renderSectionActionBar("WhatsApp")}
      <div className="fa-card p-4">
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Quick edit controls</div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          Every field below is editable now. Use Save Draft or Publish in the section action bar to persist changes.
        </p>
        <div className="mt-4 grid gap-3">
          {([
            { key: "phoneNumber", label: "Phone target", placeholder: "+123..." },
            { key: "productCta", label: "Product CTA", placeholder: "Order on WhatsApp" },
            { key: "fitCta", label: "Fit CTA", placeholder: "Ask about size" },
            { key: "lookCta", label: "Look CTA", placeholder: "Send this look on WhatsApp" },
            { key: "storyCta", label: "Story CTA", placeholder: "Shop this story on WhatsApp" }
          ] as const).map((item) => (
            <label key={item.key} className="space-y-2">
              <span className="text-sm font-semibold">{item.label}</span>
              <div className="flex gap-2">
                <input
                  value={draft.whatsapp[item.key]}
                  onChange={(e) => patchDraft("whatsapp", { [item.key]: e.target.value } as Partial<FashionBossDraft["whatsapp"]>)}
                  placeholder={item.placeholder}
                  className="fa-input w-full"
                />
                <button
                  type="button"
                  onClick={() => patchDraft("whatsapp", { [item.key]: "" } as Partial<FashionBossDraft["whatsapp"]>)}
                  className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs"
                >
                  Clear
                </button>
              </div>
            </label>
          ))}
          <label className="space-y-2">
            <span className="text-sm font-semibold">Disclaimer</span>
            <div className="space-y-2">
              <textarea
                value={draft.whatsapp.disclaimer}
                onChange={(e) => patchDraft("whatsapp", { disclaimer: e.target.value })}
                rows={3}
                className="fa-input w-full"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => patchDraft("whatsapp", { disclaimer: "" })} className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs">
                  Clear disclaimer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchDraft("whatsapp", {
                      ...defaultWhatsAppTemplateValues,
                      ...defaultWhatsAppDestinationValues
                    })
                  }
                  className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs"
                >
                  Reset defaults
                </button>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {[
          ["Phone target", draft.whatsapp.phoneNumber],
          ["Product CTA", draft.whatsapp.productCta],
          ["Look CTA", draft.whatsapp.lookCta],
          ["Story CTA", draft.whatsapp.storyCta]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-black/8 bg-white/65 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
            <div className="mt-3 break-all text-base font-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 fa-card p-4">
        {([
          ["templates", "Templates"],
          ["preview", "Message preview"],
          ["destination", "Destination & notice"],
          ["inquiries", "Recent inquiries"]
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSelectedWhatsAppPanel(id)} className={selectedWhatsAppPanel === id ? "fa-tab-btn fa-tab-btn-active" : "fa-tab-btn"}>
            {label}
          </button>
        ))}
      </div>
    </div>

    <div className="min-w-0 max-h-[58dvh] md:max-h-[42rem] overflow-y-auto pr-2">
      {selectedWhatsAppPanel === "templates" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">CTA templates</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Product CTA</span>
                <div className="flex gap-2">
                  <input value={draft.whatsapp.productCta} onChange={(e) => patchDraft("whatsapp", { productCta: e.target.value })} className="fa-input w-full" />
                  <button type="button" onClick={() => patchDraft("whatsapp", { productCta: "" })} className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs">Clear</button>
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Fit CTA</span>
                <div className="flex gap-2">
                  <input value={draft.whatsapp.fitCta} onChange={(e) => patchDraft("whatsapp", { fitCta: e.target.value })} className="fa-input w-full" />
                  <button type="button" onClick={() => patchDraft("whatsapp", { fitCta: "" })} className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs">Clear</button>
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Look CTA</span>
                <div className="flex gap-2">
                  <input value={draft.whatsapp.lookCta} onChange={(e) => patchDraft("whatsapp", { lookCta: e.target.value })} className="fa-input w-full" />
                  <button type="button" onClick={() => patchDraft("whatsapp", { lookCta: "" })} className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs">Clear</button>
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Story CTA</span>
                <div className="flex gap-2">
                  <input value={draft.whatsapp.storyCta} onChange={(e) => patchDraft("whatsapp", { storyCta: e.target.value })} className="fa-input w-full" />
                  <button type="button" onClick={() => patchDraft("whatsapp", { storyCta: "" })} className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs">Clear</button>
                </div>
              </label>
            </div>
            <div className="mt-5 grid gap-4">
              {([
                ["generalMessageTemplate", "General message template", "Use {{disclaimer}} for the shared support note."],
                ["productMessageTemplate", "Product message template", "Use {{product_name}}, {{price}}, {{product_link}}, {{source}}, {{customer_notes}}."],
                ["fitMessageTemplate", "Fit message template", "Use {{fit}}, {{occasion}}, {{product_link}}, {{customer_notes}}."],
                ["lookMessageTemplate", "Look message template", "Use {{title}}, {{items_summary}}, {{total_price}}, {{source}}."],
                ["pairMessageTemplate", "Pairing message template", "Use {{lead_product}}, {{lead_image_link}}, {{items_summary}}."],
                ["storyMessageTemplate", "Story message template", "Use {{title}}, {{items_summary}}, {{total_price}}, {{source}}."]
              ] as const).map(([key, label, note]) => (
                <label key={key} className="space-y-2">
                  <span className="text-sm font-semibold">{label}</span>
                  <textarea
                    value={draft.whatsapp[key]}
                    onChange={(e) => patchDraft("whatsapp", { [key]: e.target.value } as Partial<FashionBossDraft["whatsapp"]>)}
                    rows={5}
                    className="fa-input w-full font-mono text-xs"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">{note}</div>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => patchDraft("whatsapp", defaultWhatsAppTemplateValues)}
                className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs"
              >
                Reset CTA templates
              </button>
            </div>
          </div>
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Template guidance</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="fa-card p-4">Keep CTA labels short, clear, and action-first so the client sees clean WhatsApp intent.</div>
              <div className="fa-card p-4">Use distinct labels for products, grouped looks, and stories so the public fashion pages convert with less friction.</div>
              <div className="fa-card p-4">Available tokens: <span className="font-mono text-xs">{"{{product_name}}"}</span>, <span className="font-mono text-xs">{"{{price}}"}</span>, <span className="font-mono text-xs">{"{{product_link}}"}</span>, <span className="font-mono text-xs">{"{{items_summary}}"}</span>, <span className="font-mono text-xs">{"{{total_price}}"}</span>, <span className="font-mono text-xs">{"{{source}}"}</span>, <span className="font-mono text-xs">{"{{customer_notes}}"}</span>.</div>
            </div>
          </div>
        </div>
      )}

      {selectedWhatsAppPanel === "preview" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Message previews</p>
            <div className="mt-4 max-h-[50dvh] md:max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {[
                ["General inquiry", previewMessages.general],
                ["Product inquiry", previewMessages.product],
                ["Fit inquiry", previewMessages.fit],
                ["Look inquiry", previewMessages.look],
                ["Pairing inquiry", previewMessages.pair],
                ["Story inquiry", previewMessages.story]
              ].map(([label, body]) => (
                <div key={label} className="fa-card p-4">
                  <div className="text-sm font-semibold">{label}</div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-black/8 bg-white px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{body}</pre>
                </div>
              ))}
            </div>
          </div>
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Preview notes</p>
            <div className="mt-4 rounded-2xl border border-dashed border-black/12 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
              Keep preview messages compact and readable so teams can validate tone quickly before publish.
            </div>
          </div>
        </div>
      )}

      {selectedWhatsAppPanel === "destination" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Destination</p>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Phone number</span>
                <div className="flex gap-2">
                  <input value={draft.whatsapp.phoneNumber} onChange={(e) => patchDraft("whatsapp", { phoneNumber: e.target.value })} className="fa-input w-full" />
                  <button type="button" onClick={() => patchDraft("whatsapp", { phoneNumber: "" })} className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs">Clear</button>
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Disclaimer</span>
                <textarea value={draft.whatsapp.disclaimer} onChange={(e) => patchDraft("whatsapp", { disclaimer: e.target.value })} rows={4} className="fa-input w-full" />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => patchDraft("whatsapp", defaultWhatsAppDestinationValues)}
                  className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs"
                >
                  Reset destination defaults
                </button>
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-black/8 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Media API delivery</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Enter your WhatsApp Cloud API details here to send real image messages instead of plain `wa.me` text links.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={whatsAppApiSettings.enabled} onChange={(e) => setWhatsAppApiSettings((current) => ({ ...current, enabled: e.target.checked }))} />
                  Enable
                </label>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2"><span className="text-sm font-semibold">API base URL</span><input value={whatsAppApiSettings.apiBaseUrl} onChange={(e) => setWhatsAppApiSettings((current) => ({ ...current, apiBaseUrl: e.target.value }))} placeholder="https://graph.facebook.com" className="fa-input w-full" /></label>
                <label className="space-y-2"><span className="text-sm font-semibold">API version</span><input value={whatsAppApiSettings.apiVersion} onChange={(e) => setWhatsAppApiSettings((current) => ({ ...current, apiVersion: e.target.value }))} placeholder="v23.0" className="fa-input w-full" /></label>
                <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Access token</span><input value={whatsAppApiSettings.accessToken} onChange={(e) => setWhatsAppApiSettings((current) => ({ ...current, accessToken: e.target.value }))} placeholder="Paste your Meta WhatsApp token here" className="fa-input w-full" /></label>
                <label className="space-y-2"><span className="text-sm font-semibold">Phone number ID</span><input value={whatsAppApiSettings.phoneNumberId} onChange={(e) => setWhatsAppApiSettings((current) => ({ ...current, phoneNumberId: e.target.value }))} placeholder="WhatsApp business phone number ID" className="fa-input w-full" /></label>
                <label className="space-y-2"><span className="text-sm font-semibold">Recipient number</span><input value={whatsAppApiSettings.recipientPhoneNumber} onChange={(e) => setWhatsAppApiSettings((current) => ({ ...current, recipientPhoneNumber: e.target.value }))} placeholder="Destination number for API delivery" className="fa-input w-full" /></label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => { void saveWhatsAppApiSettings(); }} disabled={isSavingWhatsAppApi} className="fa-btn fa-btn-ghost rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {isSavingWhatsAppApi ? "Saving API..." : "Save WhatsApp API"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWhatsAppApiSettings((current) => ({
                      ...current,
                      apiBaseUrl: "",
                      apiVersion: "v23.0",
                      accessToken: "",
                      phoneNumberId: "",
                      recipientPhoneNumber: ""
                    }))
                  }
                  className="fa-btn fa-btn-ghost rounded-2xl px-4 py-2 text-sm"
                >
                  Clear API fields
                </button>
              </div>
            </div>
          </div>
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Destination status</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <FashionAdminValidationPanel title="Current destination" tone="warning">
                Current destination: <span className="font-semibold break-all">{draft.whatsapp.phoneNumber}</span>
              </FashionAdminValidationPanel>
              <FashionAdminValidationPanel title="Disclaimer" tone="warning">{draft.whatsapp.disclaimer}</FashionAdminValidationPanel>
              <FashionAdminValidationPanel title="API mode" tone={whatsAppApiSettings.enabled ? "success" : "warning"}>
                WhatsApp API mode: <span className="font-semibold">{whatsAppApiSettings.enabled ? "Enabled" : "Fallback to wa.me link"}</span>
              </FashionAdminValidationPanel>
              <FashionAdminValidationPanel title="API recipient" tone={whatsAppApiSettings.recipientPhoneNumber ? "success" : "warning"}>
                API recipient: <span className="font-semibold break-all">{whatsAppApiSettings.recipientPhoneNumber || "Not configured"}</span>
              </FashionAdminValidationPanel>
            </div>
          </div>
        </div>
      )}

      {selectedWhatsAppPanel === "inquiries" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)]">
          <div className="fa-card p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Inquiry activity</p>
            {recentInquiries.length === 0 ? (
              <FashionAdminValidationPanel className="mt-4" title="No inquiries yet" tone="warning">
                Rich inquiries will appear here after clients submit inquiry sheets.
              </FashionAdminValidationPanel>
            ) : (
              <div className="mt-4 max-h-[52dvh] space-y-3 overflow-y-auto pr-1 md:max-h-[30rem]">
                {recentInquiries.map((record) => (
                  <div key={record.id} className="fa-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{record.type}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{formatAdminTime(new Date(record.createdAt))}</div>
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{record.status}</div>
                    <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">{record.message}</div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Source: {record.source} • Phone: {record.customerMeta?.phoneNumber || "n/a"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditInquiry(record)}
                        className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs"
                        disabled={isMutatingInquiry}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteInquiry(record.id);
                        }}
                        className="fa-btn fa-btn-ghost rounded-2xl px-3 py-2 text-xs text-rose-700"
                        disabled={isMutatingInquiry}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editingRecord ? (
              <div className="mt-5 rounded-2xl border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Edit inquiry</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</span>
                    <select
                      value={editingStatus}
                      onChange={(event) => setEditingStatus(event.target.value as FashionInquiryAdminRecord["status"])}
                      className="fa-input w-full"
                    >
                      {inquiryStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phone number</span>
                    <input value={editingPhone} onChange={(event) => setEditingPhone(event.target.value)} className="fa-input w-full" />
                  </label>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Source</span>
                  <input value={editingSource} onChange={(event) => setEditingSource(event.target.value)} className="fa-input w-full" />
                </label>
                <label className="mt-3 block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Message</span>
                  <textarea
                    value={editingMessage}
                    onChange={(event) => setEditingMessage(event.target.value)}
                    rows={4}
                    className="fa-input w-full"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void updateInquiry(editingRecord.id, {
                        status: editingStatus,
                        source: editingSource,
                        message: editingMessage,
                        fallbackRequired: editingStatus === "fallback-required",
                        customerMeta: { ...editingRecord.customerMeta, phoneNumber: editingPhone }
                      });
                      cancelEditInquiry();
                    }}
                    disabled={isMutatingInquiry}
                    className="fa-btn fa-btn-ghost rounded-2xl px-4 py-2 text-xs"
                  >
                    Save inquiry
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditInquiry}
                    disabled={isMutatingInquiry}
                    className="fa-btn fa-btn-ghost rounded-2xl px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default WhatsAppSettingsWorkspace;
