export type AiAdminRole = "viewer" | "editor" | "publisher" | "owner";

export type AiCapability =
  | "ai.chat.ask"
  | "ai.web.search"
  | "ai.action.prepare"
  | "ai.action.execute"
  | "ai.action.publish";

const ROLE_CAPABILITIES: Record<AiAdminRole, AiCapability[]> = {
  viewer: ["ai.chat.ask", "ai.web.search"],
  editor: ["ai.chat.ask", "ai.web.search", "ai.action.prepare"],
  publisher: ["ai.chat.ask", "ai.web.search", "ai.action.prepare", "ai.action.execute", "ai.action.publish"],
  owner: ["ai.chat.ask", "ai.web.search", "ai.action.prepare", "ai.action.execute", "ai.action.publish"]
};

export const resolveAiAdminRole = (rawRole: string): AiAdminRole => {
  const normalized = rawRole.trim().toLowerCase();
  if (normalized === "viewer" || normalized === "editor" || normalized === "publisher" || normalized === "owner") {
    return normalized;
  }
  if (normalized.includes("owner")) return "owner";
  if (normalized.includes("publish")) return "publisher";
  if (normalized.includes("edit")) return "editor";
  return "viewer";
};

export const listCapabilitiesForRole = (role: AiAdminRole): AiCapability[] => ROLE_CAPABILITIES[role];

export const hasAiCapability = (role: AiAdminRole, capability: AiCapability) =>
  ROLE_CAPABILITIES[role].includes(capability);
