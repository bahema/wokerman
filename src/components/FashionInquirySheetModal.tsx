import { useEffect, useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import type { FashionInquirySheetInput } from "../utils/fashionInquiry";

type InquiryOption = {
  id: string;
  label: string;
};

type FashionInquirySheetModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  returnFocusTo: HTMLElement | null;
  inquiryOptions?: InquiryOption[];
  defaultInquiryType?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (payload: FashionInquirySheetInput & { inquiryType: string }) => Promise<{ ok: boolean; message: string }>;
};

const defaultPreferredMethod = "WhatsApp message";

const FashionInquirySheetModal = ({
  open,
  title,
  subtitle,
  returnFocusTo,
  inquiryOptions,
  defaultInquiryType,
  submitLabel = "Send inquiry",
  onClose,
  onSubmit
}: FashionInquirySheetModalProps) => {
  const options = useMemo(() => (inquiryOptions && inquiryOptions.length > 0 ? inquiryOptions : [{ id: "product", label: "Product inquiry" }]), [inquiryOptions]);
  const resolvedDefaultInquiryType = defaultInquiryType || options[0]?.id || "product";

  const [form, setForm] = useState<FashionInquirySheetInput>({
    customerName: "",
    phoneNumber: "",
    countryCode: "",
    preferredContactMethod: defaultPreferredMethod,
    notes: "",
    consentAccepted: false
  });
  const [inquiryType, setInquiryType] = useState(resolvedDefaultInquiryType);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success">("success");

  useEffect(() => {
    if (!open) return;
    setInquiryType(resolvedDefaultInquiryType);
    setFeedback("");
  }, [open, resolvedDefaultInquiryType]);

  const patch = (value: Partial<FashionInquirySheetInput>) => {
    setForm((current) => ({ ...current, ...value }));
  };

  const submit = async () => {
    if (!form.phoneNumber.trim()) {
      setFeedback("Phone number is required.");
      setFeedbackTone("error");
      return;
    }
    if (!form.consentAccepted) {
      setFeedback("Consent is required before sending.");
      setFeedbackTone("error");
      return;
    }

    setSubmitting(true);
    setFeedback("");
    try {
      const result = await onSubmit({ ...form, inquiryType });
      setFeedback(result.message);
      setFeedbackTone(result.ok ? "success" : "error");
      if (result.ok) {
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to send inquiry.");
      setFeedbackTone("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      labelledBy="fashion-inquiry-sheet-title"
      title={title}
      closeAriaLabel="Close inquiry sheet"
      maxWidthClassName="max-w-2xl"
    >
      <div className="space-y-4">
        {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}

        {options.length > 1 ? (
          <label className="space-y-2 block">
            <span className="text-sm font-semibold text-slate-100">Inquiry type</span>
            <select
              value={inquiryType}
              onChange={(event) => setInquiryType(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-100">Phone number</span>
            <input
              value={form.phoneNumber}
              onChange={(event) => patch({ phoneNumber: event.target.value })}
              placeholder="Enter phone number"
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-100">Country code (optional)</span>
            <input
              value={form.countryCode}
              onChange={(event) => patch({ countryCode: event.target.value })}
              placeholder="e.g. +1"
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-100">Customer name (optional)</span>
            <input
              value={form.customerName}
              onChange={(event) => patch({ customerName: event.target.value })}
              placeholder="Name"
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-100">Preferred contact method</span>
            <input
              value={form.preferredContactMethod}
              onChange={(event) => patch({ preferredContactMethod: event.target.value })}
              placeholder="WhatsApp message"
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm font-semibold text-slate-100">Additional notes (optional)</span>
          <textarea
            value={form.notes}
            onChange={(event) => patch({ notes: event.target.value })}
            rows={4}
            placeholder="Add details about size, timing, or color preferences"
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={form.consentAccepted}
            onChange={(event) => patch({ consentAccepted: event.target.checked })}
            className="mt-1"
          />
          <span>I consent to sending this inquiry through WhatsApp messaging.</span>
        </label>

        {feedback ? (
          <div className={`rounded-xl border px-3 py-2 text-sm ${feedbackTone === "success" ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200" : "border-rose-400/35 bg-rose-500/10 text-rose-200"}`}>
            {feedback}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void submit();
            }}
            disabled={submitting}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending..." : submitLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default FashionInquirySheetModal;
