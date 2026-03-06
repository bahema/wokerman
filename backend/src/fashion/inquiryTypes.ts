export type FashionInquiryType = "product" | "fit" | "look" | "collection" | "editorial-story" | "style-set";

export type FashionInquiryProduct = {
  id: string;
  name: string;
  collection?: string;
  category?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
};

export type FashionInquiryCustomerMeta = {
  name?: string;
  phoneNumber: string;
  countryCode?: string;
  preferredContactMethod?: string;
  notes?: string;
};

export type FashionInquiryConsent = {
  accepted: boolean;
  text?: string;
};

export type FashionInquiryPayload = {
  type: FashionInquiryType;
  source: string;
  message: string;
  imageUrl?: string;
  products: FashionInquiryProduct[];
  customerMeta: FashionInquiryCustomerMeta;
  consent: FashionInquiryConsent;
  fallbackPhoneNumber?: string;
};

export type FashionInquirySendMode = "rich-inquiry";

export type FashionInquiryStatus = "queued" | "api-image" | "api-text" | "fallback-required" | "failed";

export type FashionInquiryProviderResponse = {
  statusCode?: number;
  deliveryMode?: "api-image" | "api-text" | "fallback-required";
  detail?: string;
  recipientPhoneNumber?: string;
  rawBody?: string;
};

export type FashionInquiryRecord = {
  id: string;
  createdAt: string;
  type: FashionInquiryType;
  source: string;
  products: FashionInquiryProduct[];
  message: string;
  imageUrl?: string;
  customerMeta: FashionInquiryCustomerMeta;
  consent: FashionInquiryConsent;
  sendMode: FashionInquirySendMode;
  status: FashionInquiryStatus;
  providerResponse?: FashionInquiryProviderResponse;
  fallbackRequired: boolean;
};

export type FashionInquiryDeliveryMode = "api-image" | "api-text" | "fallback-required";

export type FashionInquirySendResult = {
  ok: boolean;
  deliveryMode: FashionInquiryDeliveryMode;
  fallbackRequired: boolean;
  recipientPhoneNumber?: string;
  providerResponse?: FashionInquiryProviderResponse;
  error?: string;
};
