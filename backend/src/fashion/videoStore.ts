import { promises as fs } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FashionVideoContent, FashionVideoContentMeta } from "../../../shared/fashionTypes";
import { defaultFashionVideoContent } from "../db/defaultFashionVideoContent.js";
import { createAsyncQueue } from "../utils/asyncQueue.js";
import { validateFashionVideoContent } from "./validateVideoContent.js";

type FashionVideoStoreRecord = {
  published: FashionVideoContent;
  draft: FashionVideoContent | null;
  updatedAt: string;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath: string, data: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT ?? 4000);
const API_PUBLIC_BASE_URL = (process.env.API_PUBLIC_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/+$/, "");
const FFMPEG_PATH = (process.env.FFMPEG_PATH ?? "ffmpeg").trim() || "ffmpeg";

const createPublishedRevision = (content: FashionVideoContent) =>
  createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);

const normalizeSortOrder = (content: FashionVideoContent): FashionVideoContent => ({
  videos: content.videos.map((video, index) => ({
    ...video,
    sortOrder: index + 1
  }))
});

const isProcessedVideoAsset = (url: string) => /-web\.mp4($|\?)/i.test(url);

const extractUploadFileName = (assetUrl: string) => {
  try {
    const parsed = new URL(assetUrl);
    const fileName = path.basename(parsed.pathname);
    return fileName || "";
  } catch {
    return path.basename(assetUrl);
  }
};

const hasNonEmptyAsset = (value: string | null | undefined) => typeof value === "string" && value.trim().length > 0;

const normalizePublishableVideos = (content: FashionVideoContent): FashionVideoContent => ({
  videos: content.videos.map((video) => {
    if (video.status !== "published") return video;
    if (hasNonEmptyAsset(video.videoAsset) && hasNonEmptyAsset(video.thumbnail)) return video;
    return {
      ...video,
      status: "draft"
    };
  })
});

const transcodeVideoForWeb = async (inputPath: string, outputPath: string) => {
  try {
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outputPath
    ]);
    return true;
  } catch {
    return false;
  }
};

const normalizeVideoAssets = async (content: FashionVideoContent, uploadsDir: string): Promise<FashionVideoContent> => {
  const videos = await Promise.all(
    content.videos.map(async (video) => {
      if (!video.videoAsset || isProcessedVideoAsset(video.videoAsset)) {
        return video;
      }
      const sourceFileName = extractUploadFileName(video.videoAsset);
      if (!sourceFileName) return video;
      const sourcePath = path.join(uploadsDir, sourceFileName);
      try {
        await fs.access(sourcePath);
      } catch {
        return video;
      }
      const transcodedFileName = `${Date.now()}-${randomUUID()}-web.mp4`;
      const transcodedPath = path.join(uploadsDir, transcodedFileName);
      const transcoded = await transcodeVideoForWeb(sourcePath, transcodedPath);
      if (!transcoded) {
        try {
          await fs.unlink(transcodedPath);
        } catch {
          // ignore
        }
        return video;
      }
      return {
        ...video,
        videoAsset: `${API_PUBLIC_BASE_URL}/uploads/${transcodedFileName}`
      };
    })
  );
  return { videos };
};

export const createFashionVideoStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "fashion-videos");
  const dataPath = path.join(dataDir, "content.json");
  const uploadsDir = path.join(baseDir, "uploads");
  await ensureDir(dataDir);

  const initial: FashionVideoStoreRecord = {
    published: clone(defaultFashionVideoContent),
    draft: null,
    updatedAt: new Date().toISOString()
  };

  const existing = await readJson<FashionVideoStoreRecord>(dataPath, initial);
  const publishedValidation = validateFashionVideoContent(existing.published);
  const draftValidation =
    existing.draft === null ? { ok: true as const, content: null } : validateFashionVideoContent(existing.draft);
  const hydratedBase: FashionVideoStoreRecord =
    !publishedValidation.ok || !draftValidation.ok
      ? initial
      : {
          published: publishedValidation.content,
          draft: existing.draft === null ? null : draftValidation.content,
          updatedAt: typeof existing.updatedAt === "string" && existing.updatedAt.trim() ? existing.updatedAt : initial.updatedAt
        };
  const hydrated: FashionVideoStoreRecord = {
    ...hydratedBase,
    published: normalizePublishableVideos(await normalizeVideoAssets(hydratedBase.published, uploadsDir)),
    draft: hydratedBase.draft ? normalizePublishableVideos(await normalizeVideoAssets(hydratedBase.draft, uploadsDir)) : null
  };

  await writeJson(dataPath, hydrated);

  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<FashionVideoStoreRecord>(dataPath, hydrated);
    const published = validateFashionVideoContent(record.published);
    if (!published.ok) {
      return initial;
    }
    const draft =
      record.draft === null
        ? null
        : (() => {
            const result = validateFashionVideoContent(record.draft);
            return result.ok ? result.content : null;
          })();

    const normalizedPublished = await normalizeVideoAssets(published.content, uploadsDir);
    const normalizedDraft = draft ? await normalizeVideoAssets(draft, uploadsDir) : null;
    const nextRecord = {
      published: normalizePublishableVideos(normalizedPublished),
      draft: normalizedDraft ? normalizePublishableVideos(normalizedDraft) : null,
      updatedAt: typeof record.updatedAt === "string" && record.updatedAt.trim() ? record.updatedAt : new Date().toISOString()
    };
    const changed =
      JSON.stringify(record.published) !== JSON.stringify(normalizedPublished) ||
      JSON.stringify(record.draft) !== JSON.stringify(normalizedDraft);
    if (changed) {
      await writeJson(dataPath, nextRecord);
    }
    return nextRecord;
  };

  const save = async (record: FashionVideoStoreRecord) => {
    const next = { ...record, updatedAt: new Date().toISOString() };
    await writeJson(dataPath, next);
    return next;
  };

  const getPublished = async () => {
    const record = await read();
    return record.published;
  };

  const getDraft = async () => {
    const record = await read();
    return record.draft;
  };

  const getMeta = async (): Promise<FashionVideoContentMeta> => {
    const record = await read();
    return {
      updatedAt: record.updatedAt,
      hasDraft: Boolean(record.draft),
      publishedRevision: createPublishedRevision(record.published),
      publishedVideoCount: record.published.videos.length,
      draftVideoCount: record.draft?.videos.length ?? 0,
      publishedPromotedCount: record.published.videos.filter((video) => video.isPromoted).length
    };
  };

  const saveDraft = async (draft: FashionVideoContent) => {
    return runExclusive(async () => {
      const normalizedDraft = normalizePublishableVideos(await normalizeVideoAssets(draft, uploadsDir));
      const validation = validateFashionVideoContent(normalizedDraft);
      if (!validation.ok) throw new Error(validation.error);
      const record = await read();
      await save({ ...record, draft: validation.content });
      return validation.content;
    });
  };

  const publish = async (payload?: FashionVideoContent) => {
    return runExclusive(async () => {
      const record = await read();
      const nextPublished = normalizePublishableVideos(await normalizeVideoAssets(payload ?? record.draft ?? record.published, uploadsDir));
      const validation = validateFashionVideoContent(nextPublished);
      if (!validation.ok) throw new Error(validation.error);
      const next = await save({
        ...record,
        published: validation.content,
        draft: null
      });
      return next.published;
    });
  };

  const reset = async () => {
    return runExclusive(async () => {
      const next: FashionVideoStoreRecord = {
        published: clone(defaultFashionVideoContent),
        draft: null,
        updatedAt: new Date().toISOString()
      };
      await writeJson(dataPath, next);
      return next;
    });
  };

  const togglePromote = async (videoId: string) => {
    return runExclusive(async () => {
      const record = await read();
      const draftSource = record.draft ? clone(record.draft) : null;
      const publishedSource = clone(record.published);
      let found = false;

      const mutate = (content: FashionVideoContent) =>
        normalizeSortOrder({
          videos: content.videos.map((video) => {
            if (video.id !== videoId) return video;
            found = true;
            const nextPromoted = !video.isPromoted;
            return {
              ...video,
              isPromoted: nextPromoted,
              placement: nextPromoted ? "promoted" : video.placement === "promoted" ? "feed" : video.placement
            };
          })
        });

      const nextDraft = draftSource ? mutate(draftSource) : null;
      const nextPublished = mutate(publishedSource);
      if (!found) {
        throw new Error("Video not found.");
      }

      const publishedValidation = validateFashionVideoContent(nextPublished);
      if (!publishedValidation.ok) throw new Error(publishedValidation.error);
      const draftValidation = nextDraft ? validateFashionVideoContent(nextDraft) : null;
      if (draftValidation && !draftValidation.ok) throw new Error(draftValidation.error);

      const saved = await save({
        ...record,
        published: publishedValidation.content,
        draft: nextDraft ? draftValidation!.content : record.draft
      });
      return {
        content: saved.draft ?? saved.published,
        published: saved.published
      };
    });
  };

  const deleteVideo = async (videoId: string) => {
    return runExclusive(async () => {
      const record = await read();
      const hadDraft = Boolean(record.draft);
      const nextDraft = record.draft
        ? normalizeSortOrder({
            videos: record.draft.videos.filter((video) => video.id !== videoId)
          })
        : null;
      const publishedRemoved = record.published.videos.some((video) => video.id === videoId);
      const nextPublished = normalizeSortOrder({
        videos: record.published.videos.filter((video) => video.id !== videoId)
      });

      if (!publishedRemoved && !record.draft?.videos.some((video) => video.id === videoId)) {
        throw new Error("Video not found.");
      }

      const publishedValidation = validateFashionVideoContent(nextPublished);
      if (!publishedValidation.ok) throw new Error(publishedValidation.error);
      const draftValidation = nextDraft ? validateFashionVideoContent(nextDraft) : null;
      if (draftValidation && !draftValidation.ok) throw new Error(draftValidation.error);

      const saved = await save({
        ...record,
        published: publishedValidation.content,
        draft: hadDraft ? (nextDraft ? draftValidation!.content : { videos: [] }) : null
      });
      return {
        content: saved.draft ?? saved.published,
        published: saved.published
      };
    });
  };

  const updatePlacement = async (
    videoId: string,
    placement: "landing" | "feed" | "series" | "promoted"
  ) => {
    return runExclusive(async () => {
      const record = await read();
      const draftSource = record.draft ? clone(record.draft) : null;
      const publishedSource = clone(record.published);
      let found = false;

      const mutate = (content: FashionVideoContent) =>
        normalizeSortOrder({
          videos: content.videos.map((video) => {
            if (video.id !== videoId) return video;
            found = true;
            return {
              ...video,
              placement,
              isPromoted: placement === "promoted"
            };
          })
        });

      const nextDraft = draftSource ? mutate(draftSource) : null;
      const nextPublished = mutate(publishedSource);
      if (!found) {
        throw new Error("Video not found.");
      }

      const publishedValidation = validateFashionVideoContent(nextPublished);
      if (!publishedValidation.ok) throw new Error(publishedValidation.error);
      const draftValidation = nextDraft ? validateFashionVideoContent(nextDraft) : null;
      if (draftValidation && !draftValidation.ok) throw new Error(draftValidation.error);

      const saved = await save({
        ...record,
        published: publishedValidation.content,
        draft: nextDraft ? draftValidation!.content : record.draft
      });
      return {
        content: saved.draft ?? saved.published,
        published: saved.published
      };
    });
  };

  const reorderVideo = async (videoId: string, direction: "up" | "down") => {
    return runExclusive(async () => {
      const record = await read();
      const draftSource = record.draft ? clone(record.draft) : null;
      const publishedSource = clone(record.published);
      let found = false;

      const mutate = (content: FashionVideoContent) => {
        const videos = [...content.videos].sort((a, b) => a.sortOrder - b.sortOrder);
        const currentIndex = videos.findIndex((video) => video.id === videoId);
        if (currentIndex < 0) return normalizeSortOrder({ videos });
        found = true;
        const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (swapIndex < 0 || swapIndex >= videos.length) {
          return normalizeSortOrder({ videos });
        }
        const [current] = videos.splice(currentIndex, 1);
        videos.splice(swapIndex, 0, current);
        return normalizeSortOrder({ videos });
      };

      const nextDraft = draftSource ? mutate(draftSource) : null;
      const nextPublished = mutate(publishedSource);
      if (!found) {
        throw new Error("Video not found.");
      }

      const publishedValidation = validateFashionVideoContent(nextPublished);
      if (!publishedValidation.ok) throw new Error(publishedValidation.error);
      const draftValidation = nextDraft ? validateFashionVideoContent(nextDraft) : null;
      if (draftValidation && !draftValidation.ok) throw new Error(draftValidation.error);

      const saved = await save({
        ...record,
        published: publishedValidation.content,
        draft: nextDraft ? draftValidation!.content : record.draft
      });
      return {
        content: saved.draft ?? saved.published,
        published: saved.published
      };
    });
  };

  return {
    getPublished,
    getDraft,
    getMeta,
    saveDraft,
    publish,
    reset,
    togglePromote,
    deleteVideo,
    updatePlacement,
    reorderVideo
  };
};
