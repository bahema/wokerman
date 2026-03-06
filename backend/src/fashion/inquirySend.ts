import type { FashionWhatsAppApiSettings } from "./whatsAppStore.js";
import type { FashionInquirySendResult } from "./inquiryTypes.js";

const normalizeWhatsAppNumber = (value: string) => value.replace(/\D/g, "");

export const buildFallbackWaMeUrl = (phoneNumber: string, message: string) => {
  const normalized = normalizeWhatsAppNumber(phoneNumber);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

export const sendFashionWhatsAppMessage = async (
  settings: FashionWhatsAppApiSettings,
  payload: { message: string; imageUrl?: string }
): Promise<FashionInquirySendResult> => {
  const message = payload.message.trim();
  const imageUrl = payload.imageUrl?.trim() ?? "";

  if (!message) {
    return {
      ok: false,
      deliveryMode: "fallback-required",
      fallbackRequired: true,
      error: "message is required.",
      providerResponse: {
        detail: "Message is empty.",
        deliveryMode: "fallback-required"
      }
    };
  }

  if (!settings.enabled || !settings.accessToken || !settings.phoneNumberId || !settings.recipientPhoneNumber) {
    return {
      ok: false,
      deliveryMode: "fallback-required",
      fallbackRequired: true,
      providerResponse: {
        detail: "WhatsApp API is not configured.",
        deliveryMode: "fallback-required"
      }
    };
  }

  const endpoint = `${settings.apiBaseUrl}/${settings.apiVersion}/${settings.phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${settings.accessToken}`,
    "Content-Type": "application/json"
  };

  try {
    if (imageUrl) {
      const caption = message.length > 900 ? `${message.slice(0, 897)}...` : message;
      const imageResponse = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: settings.recipientPhoneNumber,
          type: "image",
          image: {
            link: imageUrl,
            caption
          }
        })
      });

      if (!imageResponse.ok) {
        const detail = await imageResponse.text();
        return {
          ok: false,
          deliveryMode: "fallback-required",
          fallbackRequired: true,
          providerResponse: {
            statusCode: imageResponse.status,
            detail: `WhatsApp image send failed. ${detail || "No upstream response body."}`,
            deliveryMode: "fallback-required",
            rawBody: detail,
            recipientPhoneNumber: settings.recipientPhoneNumber
          }
        };
      }

      if (message.length > 900) {
        const textResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: settings.recipientPhoneNumber,
            type: "text",
            text: {
              body: message,
              preview_url: false
            }
          })
        });

        if (!textResponse.ok) {
          const detail = await textResponse.text();
          return {
            ok: false,
            deliveryMode: "fallback-required",
            fallbackRequired: true,
            providerResponse: {
              statusCode: textResponse.status,
              detail: `WhatsApp text follow-up failed. ${detail || "No upstream response body."}`,
              deliveryMode: "fallback-required",
              rawBody: detail,
              recipientPhoneNumber: settings.recipientPhoneNumber
            }
          };
        }
      }

      return {
        ok: true,
        deliveryMode: "api-image",
        fallbackRequired: false,
        recipientPhoneNumber: settings.recipientPhoneNumber,
        providerResponse: {
          deliveryMode: "api-image",
          recipientPhoneNumber: settings.recipientPhoneNumber
        }
      };
    }

    const textResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: settings.recipientPhoneNumber,
        type: "text",
        text: {
          body: message,
          preview_url: false
        }
      })
    });

    if (!textResponse.ok) {
      const detail = await textResponse.text();
      return {
        ok: false,
        deliveryMode: "fallback-required",
        fallbackRequired: true,
        providerResponse: {
          statusCode: textResponse.status,
          detail: `WhatsApp send failed. ${detail || "No upstream response body."}`,
          deliveryMode: "fallback-required",
          rawBody: detail,
          recipientPhoneNumber: settings.recipientPhoneNumber
        }
      };
    }

    return {
      ok: true,
      deliveryMode: "api-text",
      fallbackRequired: false,
      recipientPhoneNumber: settings.recipientPhoneNumber,
      providerResponse: {
        deliveryMode: "api-text",
        recipientPhoneNumber: settings.recipientPhoneNumber
      }
    };
  } catch (error) {
    return {
      ok: false,
      deliveryMode: "fallback-required",
      fallbackRequired: true,
      error: error instanceof Error ? error.message : "Unknown WhatsApp send error.",
      providerResponse: {
        detail: error instanceof Error ? error.message : "Unknown WhatsApp send error.",
        deliveryMode: "fallback-required",
        recipientPhoneNumber: settings.recipientPhoneNumber
      }
    };
  }
};
