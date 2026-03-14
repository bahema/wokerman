import { apiForm, apiGet, apiJson } from "../api/client";

export type MediaScope = "site" | "fashion";

export type MediaItem = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
};

type ApiMediaItem = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

const toMediaItem = (item: ApiMediaItem): MediaItem => ({
  id: item.id,
  name: item.name,
  dataUrl: item.url,
  createdAt: item.createdAt
});

const toScopeQuery = (scope?: MediaScope) => (scope ? `?scope=${scope}` : "");

export const getMediaLibrary = async (scope?: MediaScope): Promise<MediaItem[]> => {
  const response = await apiGet<{ items: ApiMediaItem[] }>(`/api/media${toScopeQuery(scope)}`);
  return (response.items ?? []).map(toMediaItem);
};

export const saveMediaLibrary = async (_items: MediaItem[]) => {
  // no-op for API-backed store
};

export const uploadMediaFiles = async (files: File[], scope?: MediaScope): Promise<MediaItem[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await apiForm<{ items: ApiMediaItem[] }>(`/api/media${toScopeQuery(scope)}`, formData);
  return (response.items ?? []).map(toMediaItem);
};

export const deleteMediaItem = async (id: string, scope?: MediaScope) => {
  await apiJson<{ ok: boolean; removedId: string }>(`/api/media/${id}${toScopeQuery(scope)}`, "DELETE");
};
