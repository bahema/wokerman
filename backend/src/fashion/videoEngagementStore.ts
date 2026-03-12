import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FashionVideoComment } from "../../../shared/fashionTypes.js";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type VideoReaction = "like" | "dislike";

type VideoSeed = {
  id: string;
  seedViews?: number;
  seedLikes?: number;
  seedDislikes?: number;
  seedComments?: FashionVideoComment[];
};

type VideoEngagementComment = FashionVideoComment & {
  clientId: string;
  commentReactions: Record<string, VideoReaction>;
};

type AdminVideoComment = FashionVideoComment & {
  clientId: string;
};

type VideoEngagementEntry = {
  views: number;
  viewedClientIds: string[];
  likes: number;
  dislikes: number;
  reactions: Record<string, VideoReaction>;
  comments: VideoEngagementComment[];
  updatedAt: string;
};

type VideoEngagementStoreData = {
  videos: Record<string, VideoEngagementEntry>;
};

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

const clampCount = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
const dedupe = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
const getLegacyLikedClientIds = (value: unknown) => {
  if (!value || typeof value !== "object") return [];
  const candidate = (value as { likedClientIds?: unknown }).likedClientIds;
  return Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string") : [];
};
const stripExternalLinks = (value: string) =>
  value
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/\b[a-z0-9.-]+\.(com|net|org|io|co|me|tv|ly|info|biz|app|dev|gg|shop|store|online|site|link|xyz)(\/\S*)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const countCommentReactions = (reactions: Record<string, VideoReaction>, reaction: VideoReaction) =>
  Object.values(reactions).reduce((total, current) => total + (current === reaction ? 1 : 0), 0);

const normalizeComment = (
  value: FashionVideoComment | VideoEngagementComment | undefined,
  fallbackId: string
): FashionVideoComment => ({
  id: typeof value?.id === "string" && value.id.trim() ? value.id.trim() : fallbackId,
  name: typeof value?.name === "string" && value.name.trim() ? value.name.trim().slice(0, 120) : "Guest",
  text: typeof value?.text === "string" && value.text.trim() ? value.text.trim().slice(0, 2_000) : "",
  createdAt:
    typeof value?.createdAt === "string" && value.createdAt.trim() ? value.createdAt : new Date().toISOString(),
  status: value?.status === "hidden" || value?.status === "flagged" ? value.status : "visible",
  parentId: typeof value?.parentId === "string" && value.parentId.trim() ? value.parentId.trim() : undefined,
  likes:
    typeof value?.likes === "number" && Number.isFinite(value.likes) && value.likes >= 0
      ? Math.floor(value.likes)
      : getLegacyLikedClientIds(value).length,
  dislikes: typeof value?.dislikes === "number" && Number.isFinite(value.dislikes) && value.dislikes >= 0 ? Math.floor(value.dislikes) : 0,
  reaction: value?.reaction === "like" || value?.reaction === "dislike" ? value.reaction : null,
  likedByViewer: typeof value?.likedByViewer === "boolean" ? value.likedByViewer : false,
  replies: []
});

const normalizeEngagementComment = (
  value: FashionVideoComment | VideoEngagementComment | undefined,
  fallbackId: string
): VideoEngagementComment => {
  const normalized = normalizeComment(value, fallbackId);
  return {
    ...normalized,
    likes: clampCount(normalized.likes ?? 0),
    dislikes: clampCount(normalized.dislikes ?? 0),
    replies: [],
    clientId:
      typeof (value as { clientId?: unknown })?.clientId === "string" && (value as { clientId: string }).clientId.trim()
        ? (value as { clientId: string }).clientId.trim()
        : "seed",
    commentReactions:
      (value as { commentReactions?: unknown })?.commentReactions && typeof (value as { commentReactions?: unknown }).commentReactions === "object"
        ? Object.fromEntries(
            Object.entries((value as { commentReactions: Record<string, unknown> }).commentReactions).filter(
              (entry): entry is [string, VideoReaction] =>
                Boolean(entry[0].trim()) && (entry[1] === "like" || entry[1] === "dislike")
            )
          )
        : Object.fromEntries(
            dedupe(getLegacyLikedClientIds(value)).map((clientId) => [clientId, "like" as const])
          )
  };
};

const flattenCommentTree = (comments: FashionVideoComment[] = [], parentId?: string): FashionVideoComment[] =>
  comments.flatMap((comment) => {
    const normalizedParentId =
      typeof comment.parentId === "string" && comment.parentId.trim() ? comment.parentId.trim() : parentId;
    const current: FashionVideoComment = {
      ...comment,
      parentId: normalizedParentId,
      replies: []
    };
    return [current, ...flattenCommentTree(comment.replies ?? [], current.id)];
  });

const normalizeEntry = (value: VideoEngagementEntry | undefined, seed?: VideoSeed): VideoEngagementEntry => {
  const seedViews = clampCount(seed?.seedViews ?? 0);
  const seedLikes = clampCount(seed?.seedLikes ?? 0);
  const seedDislikes = clampCount(seed?.seedDislikes ?? 0);
  const reactionsRaw = value?.reactions && typeof value.reactions === "object" ? value.reactions : {};
  const reactions = Object.fromEntries(
    Object.entries(reactionsRaw).filter((entry): entry is [string, VideoReaction] => {
      const [clientId, reaction] = entry;
      return Boolean(clientId.trim()) && (reaction === "like" || reaction === "dislike");
    })
  );

  return {
    views: Math.max(clampCount(value?.views ?? 0), seedViews),
    viewedClientIds: dedupe(Array.isArray(value?.viewedClientIds) ? value.viewedClientIds : []),
    likes: Math.max(clampCount(value?.likes ?? 0), seedLikes),
    dislikes: Math.max(clampCount(value?.dislikes ?? 0), seedDislikes),
    reactions,
    comments: Array.isArray(value?.comments)
      ? value.comments
          .map((comment, index) => normalizeEngagementComment(comment, `comment-${index + 1}`))
          .filter((comment) => Boolean(comment.text))
      : [],
    updatedAt: typeof value?.updatedAt === "string" && value.updatedAt.trim() ? value.updatedAt : new Date().toISOString()
  };
};

const buildCommentTree = (comments: FashionVideoComment[]) => {
  const nodes = new Map<string, FashionVideoComment>();
  comments.forEach((comment) => {
    nodes.set(comment.id, { ...comment, replies: [] });
  });
  const roots: FashionVideoComment[] = [];
  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    if (!node) return;
    if (comment.parentId && nodes.has(comment.parentId)) {
      nodes.get(comment.parentId)?.replies?.push(node);
      return;
    }
    roots.push(node);
  });
  const sortDeep = (items: FashionVideoComment[]) => {
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    items.forEach((item) => {
      if (item.replies?.length) sortDeep(item.replies);
    });
  };
  sortDeep(roots);
  return roots;
};

const mergeComments = (
  seedComments: FashionVideoComment[] = [],
  storedComments: VideoEngagementComment[] = [],
  clientId?: string
) => {
  const merged = new Map<string, FashionVideoComment>();
  flattenCommentTree(seedComments).forEach((comment, index) => {
    const normalized = normalizeComment(comment, `seed-${index + 1}`);
    if (normalized.status === "hidden") return;
    merged.set(normalized.id, normalized);
  });
  storedComments.forEach((comment, index) => {
    const normalized = normalizeComment(comment, `stored-${index + 1}`);
    if (normalized.status === "hidden") return;
    merged.set(normalized.id, {
      ...normalized,
      likes: countCommentReactions(comment.commentReactions, "like"),
      dislikes: countCommentReactions(comment.commentReactions, "dislike"),
      reaction: clientId ? comment.commentReactions[clientId] ?? null : null,
      likedByViewer: clientId ? comment.commentReactions[clientId] === "like" : false
    });
  });
  return buildCommentTree(Array.from(merged.values()));
};

const mergeAdminComments = (seedComments: FashionVideoComment[] = [], storedComments: VideoEngagementComment[] = []): AdminVideoComment[] => {
  const merged = new Map<string, AdminVideoComment>();
  flattenCommentTree(seedComments).forEach((comment, index) => {
    const normalized = normalizeComment(comment, `seed-${index + 1}`);
    merged.set(normalized.id, { ...normalized, clientId: "seed" });
  });
  storedComments.forEach((comment, index) => {
    const normalized = normalizeComment(comment, `stored-${index + 1}`);
    merged.set(normalized.id, { ...normalized, clientId: comment.clientId || "seed" });
  });
  return Array.from(merged.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createFashionVideoEngagementStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "fashion-videos");
  const dataPath = path.join(dataDir, "engagement.json");
  await ensureDir(dataDir);

  const initial: VideoEngagementStoreData = { videos: {} };
  const existing = await readJson<VideoEngagementStoreData>(dataPath, initial);
  await writeJson(dataPath, existing);

  const runExclusive = createAsyncQueue();

  const read = async () => readJson<VideoEngagementStoreData>(dataPath, initial);
  const save = async (value: VideoEngagementStoreData) => {
    await writeJson(dataPath, value);
    return value;
  };

  const syncVideos = async (videos: VideoSeed[]) =>
    runExclusive(async () => {
      const current = await read();
      const nextEntries: Record<string, VideoEngagementEntry> = {};
      videos.forEach((video) => {
        const id = video.id.trim();
        if (!id) return;
        nextEntries[id] = normalizeEntry(current.videos[id], video);
      });
      current.videos = nextEntries;
      await save(current);
    });

  const getSummary = async (clientId: string, videos: VideoSeed[]) =>
    runExclusive(async () => {
      const current = await read();
      const views: Record<string, number> = {};
      const likes: Record<string, number> = {};
      const dislikes: Record<string, number> = {};
      const reactions: Record<string, VideoReaction | null> = {};
      const comments: Record<string, FashionVideoComment[]> = {};
      let changed = false;

      videos.forEach((video) => {
        const id = video.id.trim();
        if (!id) return;
        const hadEntry = Boolean(current.videos[id]);
        const entry = normalizeEntry(current.videos[id], video);
        current.videos[id] = entry;
        if (!hadEntry) changed = true;
        views[id] = entry.views;
        likes[id] = entry.likes;
        dislikes[id] = entry.dislikes;
        reactions[id] = entry.reactions[clientId] ?? null;
        comments[id] = mergeComments(video.seedComments ?? [], entry.comments, clientId);
      });

      if (changed) {
        await save(current);
      }

      return { views, likes, dislikes, reactions, comments };
    });

  const recordView = async (videoId: string, clientId: string, seedViews = 0) =>
    runExclusive(async () => {
      const current = await read();
      const id = videoId.trim();
      const entry = normalizeEntry(current.videos[id], { id, seedViews });
      if (!entry.viewedClientIds.includes(clientId)) {
        entry.viewedClientIds = [...entry.viewedClientIds, clientId];
        entry.views = Math.max(entry.views + 1, clampCount(seedViews));
        entry.updatedAt = new Date().toISOString();
        current.videos[id] = entry;
        await save(current);
      }
      return { views: entry.views };
    });

  const toggleReaction = async (
    videoId: string,
    clientId: string,
    reaction: VideoReaction,
    seedLikes = 0,
    seedDislikes = 0
  ) =>
    runExclusive(async () => {
      const current = await read();
      const id = videoId.trim();
      const entry = normalizeEntry(current.videos[id], { id, seedLikes, seedDislikes });
      const currentReaction = entry.reactions[clientId] ?? null;

      if (currentReaction === reaction) {
        delete entry.reactions[clientId];
        if (reaction === "like") {
          entry.likes = Math.max(clampCount(seedLikes), entry.likes - 1);
        } else {
          entry.dislikes = Math.max(clampCount(seedDislikes), entry.dislikes - 1);
        }
      } else {
        if (currentReaction === "like") {
          entry.likes = Math.max(clampCount(seedLikes), entry.likes - 1);
        }
        if (currentReaction === "dislike") {
          entry.dislikes = Math.max(clampCount(seedDislikes), entry.dislikes - 1);
        }
        entry.reactions[clientId] = reaction;
        if (reaction === "like") {
          entry.likes += 1;
        } else {
          entry.dislikes += 1;
        }
      }

      entry.updatedAt = new Date().toISOString();
      current.videos[id] = entry;
      await save(current);

      return {
        likes: entry.likes,
        dislikes: entry.dislikes,
        reaction: entry.reactions[clientId] ?? null
      };
    });

  const addComment = async (videoId: string, clientId: string, name: string, text: string, parentId?: string) =>
    runExclusive(async () => {
      const current = await read();
      const id = videoId.trim();
      const entry = normalizeEntry(current.videos[id], { id });
      const normalizedParentId = typeof parentId === "string" && parentId.trim() ? parentId.trim() : undefined;
      if (normalizedParentId && !entry.comments.some((comment) => comment.id === normalizedParentId)) {
        throw new Error("Parent comment not found.");
      }
      const comment: VideoEngagementComment = {
        id: `comment-${randomUUID()}`,
        clientId,
        name: name.trim().slice(0, 120) || "Guest",
        text: stripExternalLinks(text).slice(0, 2_000),
        createdAt: new Date().toISOString(),
        status: "visible",
        parentId: normalizedParentId,
        likes: 0,
        dislikes: 0,
        reaction: null,
        likedByViewer: false,
        replies: [],
        commentReactions: {}
      };
      if (!comment.text) {
        throw new Error("Comments cannot contain only links. Remove the link and try again.");
      }
      entry.comments = [...entry.comments, comment];
      entry.updatedAt = new Date().toISOString();
      current.videos[id] = entry;
      await save(current);
      return normalizeComment(comment, comment.id);
    });

  const toggleCommentReaction = async (videoId: string, commentId: string, clientId: string, reaction: VideoReaction) =>
    runExclusive(async () => {
      const current = await read();
      const id = videoId.trim();
      const entry = normalizeEntry(current.videos[id], { id });
      let result: FashionVideoComment | null = null;
      entry.comments = entry.comments.map((comment) => {
        if (comment.id !== commentId) return comment;
        const currentReaction = comment.commentReactions[clientId] ?? null;
        const nextReactions = { ...comment.commentReactions };
        if (currentReaction === reaction) {
          delete nextReactions[clientId];
        } else {
          nextReactions[clientId] = reaction;
        }
        const likes = countCommentReactions(nextReactions, "like");
        const dislikes = countCommentReactions(nextReactions, "dislike");
        result = {
          ...normalizeComment(comment, comment.id),
          likes,
          dislikes,
          reaction: nextReactions[clientId] ?? null,
          likedByViewer: nextReactions[clientId] === "like"
        };
        return {
          ...comment,
          commentReactions: nextReactions,
          likes,
          dislikes,
          reaction: nextReactions[clientId] ?? null
        };
      });
      if (!result) return null;
      entry.updatedAt = new Date().toISOString();
      current.videos[id] = entry;
      await save(current);
      return result;
    });

  const getAdminSummary = async (videos: VideoSeed[]) =>
    runExclusive(async () => {
      const current = await read();
      const byVideo = videos.map((video) => {
        const id = video.id.trim();
        const entry = normalizeEntry(current.videos[id], video);
        return {
          videoId: id,
          views: entry.views,
          likes: entry.likes,
          dislikes: entry.dislikes,
          commentCount: mergeAdminComments(video.seedComments ?? [], entry.comments).length,
          comments: mergeAdminComments(video.seedComments ?? [], entry.comments)
        };
      });
      const totals = byVideo.reduce(
        (acc, item) => ({
          views: acc.views + item.views,
          likes: acc.likes + item.likes,
          dislikes: acc.dislikes + item.dislikes,
          comments: acc.comments + item.commentCount
        }),
        { views: 0, likes: 0, dislikes: 0, comments: 0 }
      );
      return { totals, byVideo };
    });

  const getPublicSummary = async (videos: VideoSeed[]) =>
    runExclusive(async () => {
      const current = await read();
      const byVideo = videos.map((video) => {
        const id = video.id.trim();
        const entry = normalizeEntry(current.videos[id], video);
        return {
          videoId: id,
          views: entry.views,
          likes: entry.likes,
          dislikes: entry.dislikes,
          comments: mergeComments(video.seedComments ?? [], entry.comments)
        };
      });
      return { byVideo };
    });

  const updateCommentStatus = async (
    videoId: string,
    commentId: string,
    status: "visible" | "hidden" | "flagged"
  ) =>
    runExclusive(async () => {
      const current = await read();
      const id = videoId.trim();
      const entry = normalizeEntry(current.videos[id], { id });
      const nextComments = entry.comments.map((comment) =>
        comment.id === commentId ? { ...comment, status } : comment
      );
      entry.comments = nextComments;
      entry.updatedAt = new Date().toISOString();
      current.videos[id] = entry;
      await save(current);
      return nextComments.find((comment) => comment.id === commentId) ?? null;
    });

  return {
    syncVideos,
    getSummary,
    getAdminSummary,
    getPublicSummary,
    recordView,
    toggleReaction,
    addComment,
    toggleCommentReaction,
    updateCommentStatus
  };
};
