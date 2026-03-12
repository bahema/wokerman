import { apiGet, apiJson } from "../api/client";

export type FashionWhatsAppApiSettings = {
  enabled: boolean;
  apiBaseUrl: string;
  apiVersion: string;
  accessToken: string;
  phoneNumberId: string;
  recipientPhoneNumber: string;
};

export const defaultFashionWhatsAppApiSettings = (): FashionWhatsAppApiSettings => ({
  enabled: false,
  apiBaseUrl: "https://graph.facebook.com",
  apiVersion: "v23.0",
  accessToken: "",
  phoneNumberId: "",
  recipientPhoneNumber: ""
});

export const getFashionWhatsAppApiSettingsAsync = async (): Promise<FashionWhatsAppApiSettings> => {
  try {
    const response = await apiGet<{ settings: FashionWhatsAppApiSettings }>("/api/fashion/whatsapp/settings");
    return response.settings ?? defaultFashionWhatsAppApiSettings();
  } catch {
    return defaultFashionWhatsAppApiSettings();
  }
};

export const saveFashionWhatsAppApiSettingsAsync = async (settings: FashionWhatsAppApiSettings) => {
  const response = await apiJson<{ settings: FashionWhatsAppApiSettings }>("/api/fashion/whatsapp/settings", "PUT", { settings });
  return response.settings;
};
