import { apiForm } from "../api/client";

export type FashionVideoUploadAsset = {
  id: string;
  name: string;
  url: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

export type FashionVideoUploadResponse = {
  item: FashionVideoUploadAsset;
  duration?: string | null;
  thumbnailItem?: FashionVideoUploadAsset | null;
  warning?: string | null;
};

export const uploadFashionVideoAsset = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiForm<FashionVideoUploadResponse>("/api/fashion-videos/media/video", formData);
};

export const uploadFashionVideoThumbnail = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiForm<FashionVideoUploadResponse>("/api/fashion-videos/media/thumbnail", formData);
  return response.item;
};

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return "";
  const raw = document.cookie;
  if (!raw) return "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    return rest.join("=");
  }
  return "";
};

const resolveApiBase = () => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  const configured = env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.split(",").map((entry: string) => entry.trim().replace(/\/+$/, "")).filter(Boolean)[0] ?? "";
  }
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${window.location.protocol}//${host}:4000`;
  }
  return window.location.origin.replace(/\/+$/, "");
};

const uploadWithProgress = <T>(
  path: string,
  formData: FormData,
  onProgress?: (value: number) => void
): Promise<T> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${resolveApiBase()}${path}`, true);
    xhr.withCredentials = true;
    const csrfToken = getCookieValue("autohub_admin_csrf");
    if (csrfToken) {
      xhr.setRequestHeader("x-csrf-token", decodeURIComponent(csrfToken));
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Failed to upload file."));
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || "{}") as T & { error?: string };
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve(payload);
          return;
        }
        reject(new Error(payload.error || `Upload failed (${xhr.status}).`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.send(formData);
  });

export const uploadFashionVideoAssetWithProgress = async (file: File, onProgress?: (value: number) => void) => {
  const formData = new FormData();
  formData.append("file", file);
  return uploadWithProgress<FashionVideoUploadResponse>("/api/fashion-videos/media/video", formData, onProgress);
};

export const uploadFashionVideoThumbnailWithProgress = async (file: File, onProgress?: (value: number) => void) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await uploadWithProgress<FashionVideoUploadResponse>("/api/fashion-videos/media/thumbnail", formData, onProgress);
  return response.item;
};
