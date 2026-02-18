export type SubscriberLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

const SUBSCRIBER_LEADS_KEY = "autohub:subscriber-leads";

export const getSubscriberLeads = (): SubscriberLead[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(SUBSCRIBER_LEADS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SubscriberLead[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.email === "string" &&
        typeof item.phone === "string" &&
        typeof item.createdAt === "string"
    );
  } catch {
    return [];
  }
};

export const addSubscriberLead = (input: { name: string; email: string; phone?: string }) => {
  if (typeof window === "undefined") return;
  const leads = getSubscriberLeads();
  const nextLead: SubscriberLead = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: (input.phone ?? "").trim(),
    createdAt: new Date().toISOString()
  };
  const next = [nextLead, ...leads];
  window.localStorage.setItem(SUBSCRIBER_LEADS_KEY, JSON.stringify(next));
};
