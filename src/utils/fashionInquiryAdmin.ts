import { apiGet, apiJson } from "../api/client";

export type FashionInquiryAdminRecord = {
  id: string;
  createdAt: string;
  type: "product" | "fit" | "look" | "collection" | "editorial-story" | "style-set";
  source: string;
  message: string;
  status: "queued" | "api-image" | "api-text" | "fallback-required" | "failed";
  fallbackRequired: boolean;
  products?: Array<{
    id: string;
    name: string;
    collection?: string;
    category?: string;
    price?: number;
    currency?: string;
    imageUrl?: string;
  }>;
  customerMeta?: {
    name?: string;
    phoneNumber?: string;
    countryCode?: string;
    preferredContactMethod?: string;
    notes?: string;
  };
  providerResponse?: {
    statusCode?: number;
    deliveryMode?: "api-image" | "api-text" | "fallback-required";
    detail?: string;
    recipientPhoneNumber?: string;
    rawBody?: string;
  };
};

export type FashionInquiryAdminUpdatePayload = {
  source?: string;
  message?: string;
  status?: FashionInquiryAdminRecord["status"];
  fallbackRequired?: boolean;
  customerMeta?: FashionInquiryAdminRecord["customerMeta"];
};

export const getFashionInquiriesAsync = async (limit = 20): Promise<FashionInquiryAdminRecord[]> => {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 200)) : 20;
  const response = await apiGet<{ records?: FashionInquiryAdminRecord[] }>(
    `/api/fashion/whatsapp/inquiries?limit=${normalizedLimit}`
  );
  return response.records ?? [];
};

export const updateFashionInquiryAsync = async (
  id: string,
  patch: FashionInquiryAdminUpdatePayload
): Promise<FashionInquiryAdminRecord> => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error("Inquiry id is required.");
  }
  const response = await apiJson<{ ok?: boolean; record?: FashionInquiryAdminRecord }>(
    `/api/fashion/whatsapp/inquiries/${encodeURIComponent(normalizedId)}`,
    "PUT",
    patch
  );
  if (!response.record) {
    throw new Error("Inquiry update response was missing record data.");
  }
  return response.record;
};

export const deleteFashionInquiryAsync = async (id: string): Promise<void> => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error("Inquiry id is required.");
  }
  await apiJson<{ ok?: boolean; id?: string }>(
    `/api/fashion/whatsapp/inquiries/${encodeURIComponent(normalizedId)}`,
    "DELETE"
  );
};
