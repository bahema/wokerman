import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import logo from "../assets/logo.png";
import FashionProductModal from "../components/FashionProductModal";
import { type FashionProduct, featuredFashionProducts, trendRail } from "../data/fashionCatalog";
import QuickGrabsModal from "../components/QuickGrabsModal";
import { withBasePath } from "../utils/basePath";
import { OPEN_COOKIE_SETTINGS_EVENT } from "../utils/cookieConsent";
import { getInitialTheme, type Theme } from "../utils/theme";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { getFashionClientViewModel, type FashionPublishedSource } from "../utils/fashionDraft";
import { normalizeFashionDisplayConfig, selectRelatedProducts } from "../utils/fashionProductDisplay";
import { openFashionProductCheckout } from "../utils/fashionWhatsApp";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";
import { type FashionVideoPageRecord } from "../utils/fashionVideoContent";
import {
  getFashionVideoEngagementSummary,
  recordFashionVideoView,
  submitFashionVideoComment,
  toggleFashionVideoCommentReaction,
  toggleFashionVideoReaction,
  type FashionVideoCommentView,
  type FashionVideoReaction
} from "../utils/fashionVideoEngagement";
import { useFashionVideoPublishedSync } from "../hooks/useFashionVideoPublishedSync";
import { removeStructuredData, setStructuredData } from "../utils/seo";

const openPath = (path: string) => {
  window.history.pushState({}, "", withBasePath(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const getInitialActiveVideoId = () => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("video");
};

const getInitialAutoplayIntent = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("autoplay") === "1";
};

const parseVideoLengthToSeconds = (length: string) => {
  const parts = length.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

const formatVideoTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatViewCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatPlaybackRate = (value: number) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2).replace(/\.?0+$/, "")}x`;

const isInteractiveTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
};

const appendReplyToCommentTree = (
  comments: FashionVideoCommentView[],
  parentId: string,
  reply: FashionVideoCommentView
): FashionVideoCommentView[] =>
  comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), reply]
      };
    }
    if (!comment.replies?.length) return comment;
    return {
      ...comment,
      replies: appendReplyToCommentTree(comment.replies, parentId, reply)
    };
  });

const updateCommentInTree = (
  comments: FashionVideoCommentView[],
  commentId: string,
  updater: (comment: FashionVideoCommentView) => FashionVideoCommentView
): FashionVideoCommentView[] =>
  comments.map((comment) => {
    if (comment.id === commentId) return updater(comment);
    if (!comment.replies?.length) return comment;
    return {
      ...comment,
      replies: updateCommentInTree(comment.replies, commentId, updater)
    };
  });

const commentFontStyle = {
  fontFamily: "Roboto, 'Helvetica Neue', Arial, sans-serif"
} satisfies React.CSSProperties;

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const shuffleWithSeed = <T,>(items: T[], seed: number) => {
  const next = [...items];
  const random = createSeededRandom(seed);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

type FashionVideoEngagementState = {
  views: Record<string, number>;
  likes: Record<string, number>;
  dislikes: Record<string, number>;
  reactions: Record<string, FashionVideoReaction>;
  comments: Record<string, FashionVideoCommentView[]>;
};

type PlaybackRequestKind = "user" | "auto";

type PlaybackRequest = {
  videoId: string;
  kind: PlaybackRequestKind;
  requestId: number;
};

type PlayerFeedback = {
  label: string;
  detail?: string;
};

type VideoBrowseFilter = "all" | "same-collection" | "promoted" | "trending";

const FashionVideos = () => {
  const initialRouteVideoIdRef = useRef<string | null>(getInitialActiveVideoId());
  const initialAutoplayIntentRef = useRef<boolean>(getInitialAutoplayIntent());
  const playbackRequestCounterRef = useRef(0);
  const loadedEngagementSignatureRef = useRef<string>("");
  const recordedViewVideoIdsRef = useRef<Set<string>>(new Set());
  const pendingUserPlayVideoIdRef = useRef<string | null>(null);
  const [theme] = useState<Theme>(() => getInitialTheme());
  const [quickGrabsOpen, setQuickGrabsOpen] = useState(false);
  const [quickGrabsTrigger, setQuickGrabsTrigger] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [videoBrowseFilter, setVideoBrowseFilter] = useState<VideoBrowseFilter>("all");
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(() => getInitialActiveVideoId());
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [productTrigger, setProductTrigger] = useState<HTMLElement | null>(null);
  const [rotationSeed, setRotationSeed] = useState(() => Math.floor(Date.now() % 2147483647));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoMutedForPlayback, setAutoMutedForPlayback] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(1);
  const [isLargePlayer, setIsLargePlayer] = useState(true);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playerDurationSeconds, setPlayerDurationSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerFeedback, setPlayerFeedback] = useState<PlayerFeedback | null>(null);
  const [canPlayVideoId, setCanPlayVideoId] = useState<string | null>(null);
  const [playbackRequest, setPlaybackRequest] = useState<PlaybackRequest | null>(null);
  const playerFrameRef = useRef<HTMLDivElement | null>(null);
  const playerVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const [contentSource, setContentSource] = useState<FashionPublishedSource>("loading");
  const [videoRecords, setVideoRecords] = useState<FashionVideoPageRecord[]>([]);
  const [engagement, setEngagement] = useState<FashionVideoEngagementState>({
    views: {},
    likes: {},
    dislikes: {},
    reactions: {},
    comments: {}
  });
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [replyParentCommentId, setReplyParentCommentId] = useState<string | null>(null);
  const [replyParentCommentName, setReplyParentCommentName] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const eventThemeVars = useMemo(() => getEventThemeCssVars("none", theme), [theme]);
  const filteredVideoCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const randomizedVideos = shuffleWithSeed(videoRecords, rotationSeed);
    if (!query) return randomizedVideos;
    return randomizedVideos.filter((item) => [item.title, item.length, item.note].join(" ").toLowerCase().includes(query));
  }, [rotationSeed, searchQuery, videoRecords]);
  const activeVideo = useMemo(() => filteredVideoCards.find((item) => item.id === activeVideoId) ?? videoRecords.find((item) => item.id === activeVideoId) ?? null, [activeVideoId, filteredVideoCards, videoRecords]);
  const allProducts = useMemo(
    () => (fashionViewModel.productCatalog?.length ? fashionViewModel.productCatalog : [...featuredFashionProducts, ...trendRail]),
    [fashionViewModel]
  );
  const collectionsLabel = fashionViewModel.homepage.footerLinkCollectionsLabel || "Browse collections";
  const displayConfig = useMemo(
    () =>
      normalizeFashionDisplayConfig({
        enforceUniquePerPage: fashionViewModel.pricing?.enforceUniquePerPage,
        relatedProductLimit: fashionViewModel.pricing?.relatedProductLimit
      }),
    [fashionViewModel.pricing?.enforceUniquePerPage, fashionViewModel.pricing?.relatedProductLimit]
  );
  const activeVideoProduct = useMemo(() => {
    if (!activeVideo || allProducts.length === 0) return null;
    const mapped = allProducts.find((product) => product.id === activeVideo.mappedProductId);
    if (mapped) return mapped;
    const videoIndex = filteredVideoCards.findIndex((item) => item.id === activeVideo.id);
    if (videoIndex < 0) return allProducts[0] ?? null;
    return allProducts[videoIndex % allProducts.length] ?? null;
  }, [activeVideo, allProducts, filteredVideoCards]);
  const activeVideoCheckoutProduct = useMemo(() => {
    if (!activeVideoProduct || !activeVideo) return null;
    return {
      ...activeVideoProduct,
      whatsappNumber: activeVideo.whatsappNumber?.trim() || activeVideoProduct.whatsappNumber
    };
  }, [activeVideo, activeVideoProduct]);
  const relatedProducts = useMemo(
    () =>
      selectRelatedProducts({
        selectedProduct,
        allProducts,
        excludeIds: activeVideoProduct ? [activeVideoProduct.id] : [],
        limit: displayConfig.relatedProductLimit,
        allowReuseFallback: true
      }),
    [activeVideoProduct, allProducts, displayConfig.relatedProductLimit, selectedProduct]
  );
  const activeVideoDurationSeconds = playerDurationSeconds > 0 ? playerDurationSeconds : activeVideo ? parseVideoLengthToSeconds(activeVideo.length) : 0;
  const activeVideoDurationLabel = activeVideoDurationSeconds > 0 ? formatVideoTime(activeVideoDurationSeconds) : activeVideo?.length ?? "00:00";
  const engagementSeedSignature = useMemo(
    () =>
      videoRecords
        .map((video) => `${video.id}:${video.viewCount}:${video.likes}:${video.dislikes}:${video.comments.length}`)
        .join("|"),
    [videoRecords]
  );
  const progressRatio = activeVideoDurationSeconds > 0 ? Math.min(elapsedSeconds / activeVideoDurationSeconds, 1) : 0;
  const hasPlaybackEnded = Boolean(activeVideo && activeVideoDurationSeconds > 0 && elapsedSeconds >= activeVideoDurationSeconds && !isPlaying);
  const effectiveMuted = isMuted || autoMutedForPlayback;
  const volumePercent = Math.round(volumeLevel * 100);
  const visibleVideoCards = useMemo(() => {
    if (videoBrowseFilter === "promoted") {
      const promoted = filteredVideoCards.filter((item) => item.isPromoted || item.placement === "promoted");
      return promoted.length ? promoted : filteredVideoCards;
    }
    if (videoBrowseFilter === "same-collection" && activeVideo?.collection) {
      const sameCollection = filteredVideoCards.filter((item) => item.collection === activeVideo.collection);
      return sameCollection.length ? sameCollection : filteredVideoCards;
    }
    if (videoBrowseFilter === "trending") {
      return [...filteredVideoCards].sort((left, right) => {
        const leftScore =
          (engagement.views[left.id] ?? left.viewCount) +
          (engagement.likes[left.id] ?? left.likes) * 8 -
          (engagement.dislikes[left.id] ?? left.dislikes) * 3;
        const rightScore =
          (engagement.views[right.id] ?? right.viewCount) +
          (engagement.likes[right.id] ?? right.likes) * 8 -
          (engagement.dislikes[right.id] ?? right.dislikes) * 3;
        return rightScore - leftScore;
      });
    }
    return filteredVideoCards;
  }, [activeVideo?.collection, engagement.dislikes, engagement.likes, engagement.views, filteredVideoCards, videoBrowseFilter]);
  const suggestedVideos = useMemo(
    () => (activeVideo ? visibleVideoCards.filter((item) => item.id !== activeVideo.id) : visibleVideoCards),
    [activeVideo, visibleVideoCards]
  );
  const videoBrowseFilterOptions = activeVideo
    ? [
        { id: "all" as const, label: "Up next" },
        { id: "same-collection" as const, label: "Same collection" },
        { id: "promoted" as const, label: "Promoted" },
        { id: "trending" as const, label: "Trending" }
      ]
    : [
        { id: "all" as const, label: "All videos" },
        { id: "promoted" as const, label: "Promoted" },
        { id: "trending" as const, label: "Trending" }
      ];
  const endScreenVideos = useMemo(() => {
    const promoted = shuffleWithSeed(
      suggestedVideos.filter((video) => video.isPromoted || video.placement === "promoted"),
      rotationSeed + 17
    );
    const related = shuffleWithSeed(
      suggestedVideos.filter((video) => !promoted.some((item) => item.id === video.id) && video.collection === activeVideo?.collection),
      rotationSeed + 29
    );
    const remaining = shuffleWithSeed(
      suggestedVideos.filter((video) => !promoted.some((item) => item.id === video.id) && !related.some((item) => item.id === video.id)),
      rotationSeed + 43
    );
    return [...promoted, ...related, ...remaining].slice(0, 3);
  }, [activeVideo?.collection, rotationSeed, suggestedVideos]);
  const hoverRevealClassName = isPictureInPicture ? "group-hover:opacity-100" : "group-hover:opacity-100 group-focus-within:opacity-100";
  const controlButtonClassName = isPictureInPicture
    ? "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white"
    : "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white";
  const primaryControlButtonClassName = isPictureInPicture
    ? "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#171513]"
    : "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171513]";
  const controlIconClassName = isPictureInPicture ? "h-3.5 w-3.5" : "h-4 w-4";

  useEffect(() => {
    setCommentComposerOpen(false);
    setElapsedSeconds(0);
    setPlayerDurationSeconds(0);
    setPlaybackRate(1);
    setPlayerFeedback(null);
    setIsPictureInPicture(false);
    setCanPlayVideoId(null);
    setCommentError("");
    setCommentText("");
    setReplyParentCommentId(null);
    setReplyParentCommentName("");
  }, [activeVideoId]);

  useEffect(() => {
    if (!playerVideoRef.current) return;
    playerVideoRef.current.currentTime = 0;
  }, [activeVideoId]);

  useFashionPublishedSync(setFashionViewModel);

  useFashionVideoPublishedSync(setVideoRecords, {
    onLoaded: () => setContentSource("live"),
    onUnavailable: () => setContentSource("unavailable")
  });

  useEffect(() => {
    const canonical = new URL(withBasePath("/fashion/videos"), `${window.location.origin}/`).toString();
    const seoVideos = videoRecords.slice(0, 12).map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "VideoObject",
        name: video.title,
        description: video.note,
        thumbnailUrl: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
        contentUrl: video.videoAssetUrl || undefined
      }
    }));
    const payload = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${canonical}#fashion-videos`,
      url: canonical,
      name: activeVideo ? `${activeVideo.title} | AutoHub Fashion Videos` : "AutoHub Fashion Videos",
      description: activeVideo?.note || "Watch promoted and curated AutoHub fashion videos, campaign motion, and next-up recommendations.",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: seoVideos
      }
    };
    setStructuredData("fashion-videos", payload);
    return () => removeStructuredData("fashion-videos");
  }, [activeVideo, videoRecords]);

  useEffect(() => {
    if (contentSource !== "live") return;
    setActiveVideoId((current) => {
      if (current && videoRecords.some((video) => video.id === current)) return current;
      return null;
    });
  }, [contentSource, videoRecords]);

  useEffect(() => {
    const rotate = () => setRotationSeed(Math.floor(Date.now() % 2147483647));
    const handleVisibility = () => {
      if (document.visibilityState === "visible") rotate();
    };
    const interval = window.setInterval(rotate, 60_000);
    window.addEventListener("focus", rotate);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", rotate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsSearchOverlayOpen(false);
      setIsMobileMenuOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isSearchOverlayOpen) return;
    const timer = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [isSearchOverlayOpen]);

  useEffect(() => {
    if (!activeVideo) return;
    if (initialRouteVideoIdRef.current !== activeVideo.id) return;
    if (initialAutoplayIntentRef.current) {
      pendingUserPlayVideoIdRef.current = activeVideo.id;
      initialAutoplayIntentRef.current = false;
    } else {
      setPlaybackRequest({
        videoId: activeVideo.id,
        kind: "auto",
        requestId: ++playbackRequestCounterRef.current
      });
    }
    initialRouteVideoIdRef.current = null;
  }, [activeVideo]);

  useEffect(() => {
    if (contentSource !== "live" || !videoRecords.length || !engagementSeedSignature) return;
    if (loadedEngagementSignatureRef.current === engagementSeedSignature) return;
    let current = true;
    const loadEngagement = async () => {
      try {
        const summary = await getFashionVideoEngagementSummary(
          videoRecords.map((video) => ({
            id: video.id,
            seedViews: video.viewCount,
            seedLikes: video.likes,
            seedDislikes: video.dislikes,
            seedComments: video.comments
          }))
        );
        if (!current) return;
        loadedEngagementSignatureRef.current = engagementSeedSignature;
        setEngagement(summary);
      } catch {
        if (!current) return;
      }
    };
    void loadEngagement();
    return () => {
      current = false;
    };
  }, [contentSource, engagementSeedSignature, videoRecords]);

  useEffect(() => {
    if (!activeVideoId || !activeVideo) return;
    if (recordedViewVideoIdsRef.current.has(activeVideoId)) return;
    recordedViewVideoIdsRef.current.add(activeVideoId);
    void recordFashionVideoView(activeVideoId, activeVideo.viewCount)
      .then((result) => {
        setEngagement((current) => ({
          ...current,
          views: {
            ...current.views,
            [activeVideoId]: result.views
          }
        }));
      })
      .catch(() => {
        recordedViewVideoIdsRef.current.delete(activeVideoId);
      });
  }, [activeVideo, activeVideoId]);

  useEffect(() => {
    if (activeVideo?.videoAssetUrl) return undefined;
    if (!isPlaying || !activeVideoDurationSeconds) return undefined;
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => {
        if (current >= activeVideoDurationSeconds) {
          window.clearInterval(timer);
          return activeVideoDurationSeconds;
        }
        return Math.min(current + 1, activeVideoDurationSeconds);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeVideo?.videoAssetUrl, isPlaying, activeVideoDurationSeconds]);

  useEffect(() => {
    if (playerVideoRef.current) {
      playerVideoRef.current.muted = effectiveMuted;
      playerVideoRef.current.volume = volumeLevel;
    }
  }, [effectiveMuted, volumeLevel]);

  useEffect(() => {
    if (playerVideoRef.current) {
      playerVideoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!playerFeedback) return undefined;
    const timer = window.setTimeout(() => setPlayerFeedback(null), 900);
    return () => window.clearTimeout(timer);
  }, [playerFeedback]);

  useEffect(() => {
    if (activeVideo?.videoAssetUrl) return undefined;
    if (elapsedSeconds >= activeVideoDurationSeconds && activeVideoDurationSeconds > 0) {
      setIsPlaying(false);
    }
  }, [activeVideo?.videoAssetUrl, elapsedSeconds, activeVideoDurationSeconds]);

  const toggleFullscreen = async () => {
    if (!playerFrameRef.current || typeof document === "undefined") return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await playerFrameRef.current.requestFullscreen();
  };

  const logPlaybackError = (
    stage: "manual-play" | "request-play" | "auto-muted-retry" | "user-ref-play" | "user-canplay-play",
    error: unknown,
    context: { videoId: string; kind: PlaybackRequestKind | "manual"; muted: boolean }
  ) => {
    const normalized =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: "UnknownError", message: String(error) };
    console.error("[FashionVideos] playback failed", {
      stage,
      videoId: context.videoId,
      requestKind: context.kind,
      muted: context.muted,
      ...normalized
    });
  };

  const logPlaybackEvent = (
    stage: "user-play-requested" | "player-ref-attached" | "user-play-attempt" | "user-play-success",
    context: { videoId: string; muted: boolean }
  ) => {
    console.info("[FashionVideos] playback", {
      stage,
      videoId: context.videoId,
      muted: context.muted
    });
  };

  const attemptDirectUserPlayback = async (
    video: HTMLVideoElement,
    videoId: string,
    stage: "user-ref-play" | "user-canplay-play"
  ) => {
    if (pendingUserPlayVideoIdRef.current !== videoId) return false;
    logPlaybackEvent("user-play-attempt", { videoId, muted: false });
    video.muted = false;
    try {
      await video.play();
      pendingUserPlayVideoIdRef.current = null;
      setAutoMutedForPlayback(false);
      setIsMuted(false);
      setIsPlaying(true);
      setPlaybackRequest((current) => (current?.videoId === videoId && current.kind === "user" ? null : current));
      logPlaybackEvent("user-play-success", { videoId, muted: false });
      return true;
    } catch (error) {
      logPlaybackError(stage, error, {
        videoId,
        kind: "user",
        muted: false
      });
      if (stage === "user-canplay-play") {
        pendingUserPlayVideoIdRef.current = null;
      }
      return false;
    }
  };

  const attemptPlaybackRequest = async (
    video: HTMLVideoElement,
    request: PlaybackRequest
  ) => {
    const requestedMuted = request.kind === "user" ? false : effectiveMuted;
    video.muted = requestedMuted;
    try {
      await video.play();
      setIsPlaying(true);
      setPlaybackRequest((current) => (current?.requestId === request.requestId ? null : current));
      return true;
    } catch (error) {
      logPlaybackError("request-play", error, {
        videoId: request.videoId,
        kind: request.kind,
        muted: requestedMuted
      });
      if (request.kind === "auto" && !requestedMuted) {
        try {
          video.muted = true;
          await video.play();
          setAutoMutedForPlayback(true);
          setIsPlaying(true);
          setPlaybackRequest((current) => (current?.requestId === request.requestId ? null : current));
          return true;
        } catch (retryError) {
          logPlaybackError("auto-muted-retry", retryError, {
            videoId: request.videoId,
            kind: request.kind,
            muted: true
          });
        }
      }
      setIsPlaying(false);
      return false;
    }
  };

  const showPlayerFeedback = (label: string, detail?: string) => {
    setPlayerFeedback({ label, detail });
  };

  const seekVideoBy = (deltaSeconds: number) => {
    if (!activeVideo) return;
    const player = playerVideoRef.current;
    if (player && activeVideo.videoAssetUrl) {
      const duration = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : activeVideoDurationSeconds;
      const nextTime = clamp(player.currentTime + deltaSeconds, 0, duration || Math.max(player.currentTime + deltaSeconds, 0));
      player.currentTime = nextTime;
      setElapsedSeconds(nextTime);
    } else {
      setElapsedSeconds((current) => clamp(current + deltaSeconds, 0, activeVideoDurationSeconds || Math.max(current + deltaSeconds, 0)));
    }
    showPlayerFeedback(`${deltaSeconds > 0 ? "+" : "-"}${Math.abs(deltaSeconds)} sec`, "Seek");
  };

  const changePlaybackRate = (delta: number) => {
    const nextRate = clamp(Number((playbackRate + delta).toFixed(2)), 0.25, 2);
    setPlaybackRate(nextRate);
    showPlayerFeedback(formatPlaybackRate(nextRate), "Playback speed");
  };

  const attachPlayerVideoRef = (node: HTMLVideoElement | null) => {
    playerVideoRef.current = node;
    if (!node || !activeVideo) return;
    node.playbackRate = playbackRate;
    logPlaybackEvent("player-ref-attached", {
      videoId: activeVideo.id,
      muted: effectiveMuted
    });
    if (node.readyState >= 2) {
      setCanPlayVideoId(activeVideo.id);
      void attemptDirectUserPlayback(node, activeVideo.id, "user-ref-play");
    }
  };

  useEffect(() => {
    if (!playbackRequest || !activeVideo || !playerVideoRef.current) return;
    if (playbackRequest.kind === "user") return;
    if (playbackRequest.videoId !== activeVideo.id) return;
    if (canPlayVideoId !== activeVideo.id) return;

    const request = playbackRequest;
    const video = playerVideoRef.current;
    let cancelled = false;

    const run = async () => {
      const played = await attemptPlaybackRequest(video, request);
      if (!cancelled && played) return;
      if (!cancelled) {
        setPlaybackRequest((current) => (current?.requestId === request.requestId ? null : current));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeVideo, canPlayVideoId, effectiveMuted, playbackRequest]);

  const togglePlayback = async () => {
    if (!activeVideo) return;
    if (activeVideo.videoAssetUrl && playerVideoRef.current) {
      const video = playerVideoRef.current;
      if (video.paused || video.ended) {
        try {
          setAutoMutedForPlayback(false);
          video.muted = isMuted;
          await video.play();
          setIsPlaying(true);
        } catch (error) {
          logPlaybackError("manual-play", error, {
            videoId: activeVideo.id,
            kind: "manual",
            muted: isMuted
          });
          setIsPlaying(false);
        }
      } else {
        video.pause();
        setIsPlaying(false);
      }
      return;
    }
    setIsPlaying((current) => !current);
  };

  const handleVolumeChange = (nextValue: number) => {
    const clamped = Math.max(0, Math.min(nextValue, 1));
    setVolumeLevel(clamped);
    setAutoMutedForPlayback(false);
    setIsMuted(clamped === 0);
    if (playerVideoRef.current) {
      playerVideoRef.current.volume = clamped;
      playerVideoRef.current.muted = clamped === 0;
    }
  };

  const openVideo = (videoId: string, kind: PlaybackRequestKind = "user") => {
    if (playerVideoRef.current && activeVideoId && activeVideoId !== videoId) {
      playerVideoRef.current.pause();
    }
    if (kind === "user") {
      setIsMuted(false);
      setAutoMutedForPlayback(false);
      setIsPictureInPicture(false);
      setIsLargePlayer(true);
      pendingUserPlayVideoIdRef.current = videoId;
      logPlaybackEvent("user-play-requested", { videoId, muted: false });
      setPlaybackRequest(null);
      flushSync(() => {
        setActiveVideoId(videoId);
      });
      if (isMobileViewport) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      const currentPlayer = playerVideoRef.current;
      if (currentPlayer && currentPlayer.readyState >= 2) {
        void attemptDirectUserPlayback(currentPlayer, videoId, "user-ref-play");
      }
      return;
    } else {
      const nextRequest: PlaybackRequest = {
        videoId,
        kind,
        requestId: ++playbackRequestCounterRef.current
      };
      setPlaybackRequest(nextRequest);
    }

    setActiveVideoId(videoId);
    if (isMobileViewport) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getVideoEngagement = (video: FashionVideoPageRecord) => ({
    views: engagement.views[video.id] ?? video.viewCount,
    likes: engagement.likes[video.id] ?? video.likes,
    dislikes: engagement.dislikes[video.id] ?? video.dislikes,
    reaction: engagement.reactions[video.id] ?? null,
    comments: engagement.comments[video.id] ?? video.comments
  });

  const handleReactionToggle = async (video: FashionVideoPageRecord, reaction: "like" | "dislike") => {
    try {
      const result = await toggleFashionVideoReaction(video.id, reaction, video.likes, video.dislikes);
      setEngagement((current) => ({
        ...current,
        likes: { ...current.likes, [video.id]: result.likes },
        dislikes: { ...current.dislikes, [video.id]: result.dislikes },
        reactions: { ...current.reactions, [video.id]: result.reaction }
      }));
    } catch {
      return;
    }
  };

  const handleCommentSubmit = async () => {
    if (!activeVideo) return;
    const trimmedName = commentName.trim();
    const trimmedText = commentText.trim();
    if (!trimmedName || !trimmedText) {
      setCommentError(replyParentCommentId ? "Name and reply are required." : "Name and comment are required.");
      return;
    }
    setCommentSubmitting(true);
    setCommentError("");
    try {
      const response = await submitFashionVideoComment(activeVideo.id, trimmedName, trimmedText, replyParentCommentId ?? undefined);
      setEngagement((current) => ({
        ...current,
        comments: {
          ...current.comments,
          [activeVideo.id]: replyParentCommentId
            ? appendReplyToCommentTree(current.comments[activeVideo.id] ?? activeVideo.comments, replyParentCommentId, {
                ...response.comment,
                replies: []
              })
            : [...(current.comments[activeVideo.id] ?? activeVideo.comments), { ...response.comment, replies: [] }]
        }
      }));
      setCommentComposerOpen(false);
      setCommentText("");
      setCommentName("");
      setReplyParentCommentId(null);
      setReplyParentCommentName("");
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : replyParentCommentId ? "Failed to post reply." : "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentReactionToggle = async (commentId: string, reaction: "like" | "dislike") => {
    if (!activeVideo) return;
    try {
      const response = await toggleFashionVideoCommentReaction(activeVideo.id, commentId, reaction);
      setEngagement((current) => ({
        ...current,
        comments: {
          ...current.comments,
          [activeVideo.id]: updateCommentInTree(current.comments[activeVideo.id] ?? activeVideo.comments, commentId, (comment) => ({
            ...comment,
            likes: response.comment.likes ?? 0,
            dislikes: response.comment.dislikes ?? 0,
            reaction: response.comment.reaction ?? null,
            likedByViewer: response.comment.likedByViewer ?? false
          }))
        }
      }));
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !activeVideo || isMobileViewport) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveTypingTarget(event.target)) return;
      const key = event.key;

      if ((key === " " || key.toLowerCase() === "k") && !event.repeat) {
        event.preventDefault();
        const shouldPlay = playerVideoRef.current ? playerVideoRef.current.paused || playerVideoRef.current.ended : !isPlaying;
        void togglePlayback().then(() => {
          showPlayerFeedback(shouldPlay ? "Playing" : "Paused", "Keyboard");
        });
        return;
      }

      if (key === "ArrowLeft") {
        event.preventDefault();
        seekVideoBy(-5);
        return;
      }

      if (key === "ArrowRight") {
        event.preventDefault();
        seekVideoBy(5);
        return;
      }

      if (key.toLowerCase() === "j") {
        event.preventDefault();
        seekVideoBy(-10);
        return;
      }

      if (key.toLowerCase() === "l") {
        event.preventDefault();
        seekVideoBy(10);
        return;
      }

      if (key === "ArrowUp") {
        event.preventDefault();
        const nextVolume = clamp((effectiveMuted ? 0 : volumeLevel) + 0.05, 0, 1);
        handleVolumeChange(nextVolume);
        showPlayerFeedback(`${Math.round(nextVolume * 100)}%`, "Volume");
        return;
      }

      if (key === "ArrowDown") {
        event.preventDefault();
        const nextVolume = clamp((effectiveMuted ? 0 : volumeLevel) - 0.05, 0, 1);
        handleVolumeChange(nextVolume);
        showPlayerFeedback(`${Math.round(nextVolume * 100)}%`, nextVolume === 0 ? "Muted" : "Volume");
        return;
      }

      if (key.toLowerCase() === "m" && !event.repeat) {
        event.preventDefault();
        const nextMuted = !(autoMutedForPlayback ? false : isMuted);
        setAutoMutedForPlayback(false);
        setIsMuted(nextMuted);
        showPlayerFeedback(nextMuted ? "Muted" : "Sound on", "Keyboard");
        return;
      }

      if (key.toLowerCase() === "f" && !event.repeat) {
        event.preventDefault();
        const shouldEnterFullscreen = !document.fullscreenElement;
        void toggleFullscreen().then(() => {
          showPlayerFeedback(shouldEnterFullscreen ? "Fullscreen" : "Windowed", "Keyboard");
        });
        return;
      }

      if (event.shiftKey && key === ">") {
        event.preventDefault();
        changePlaybackRate(0.25);
        return;
      }

      if (event.shiftKey && key === "<") {
        event.preventDefault();
        changePlaybackRate(-0.25);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo, autoMutedForPlayback, effectiveMuted, isMobileViewport, isMuted, isPlaying, playbackRate, volumeLevel]);

  const activeVideoStats = activeVideo ? getVideoEngagement(activeVideo) : null;
  const activeCommentThread = activeVideoStats?.comments.length
    ? activeVideoStats.comments
    : [{ id: "empty-comment", name: "No comments yet", text: "Comments will appear here when viewers start posting." }];
  const hasMobileCommentRail = isMobileViewport && activeCommentThread.length > 5;
  const browseFilterChips = (
    <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [-ms-overflow-style:none]">
      {videoBrowseFilterOptions.map((option) => {
        const isActive = videoBrowseFilter === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setVideoBrowseFilter(option.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[#15120f] text-white dark:bg-white dark:text-[#171513]"
                : "border border-black/10 bg-[#ece2d4] text-[#4f4032] hover:bg-[#e4d7c8] dark:border-white/10 dark:bg-white/10 dark:text-[#f3e7d9] dark:hover:bg-white/15"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
  const suggestedVideosPanel = activeVideo ? (
    <aside className="min-w-0 self-start p-1">
      <div className="mb-3">{browseFilterChips}</div>
      <div className="grid gap-3">
        {suggestedVideos.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-black/12 bg-[#f8f3ec] px-4 py-5 text-sm font-medium text-[#5d5248] dark:border-white/10 dark:bg-[#1e1a17] dark:text-[#d5c8bc]">
            No videos match this filter yet. Try another tab.
          </div>
        ) : null}
        {suggestedVideos.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openVideo(item.id)}
            className="grid items-start gap-3 rounded-[1.2rem] border border-black/8 bg-[#f8f3ec] p-3 text-left transition hover:border-[#b68b62]/40 hover:bg-[#f1e8dc] dark:border-white/10 dark:bg-[#1e1a17] dark:hover:border-[#d5b18b]/40 dark:hover:bg-[#24201c] sm:grid-cols-[9.5rem_1fr] xl:grid-cols-[10.5rem_1fr]"
            style={{ animation: `fadeUp ${0.24 + index * 0.04}s ease-out` }}
          >
            <div className="relative aspect-video overflow-hidden rounded-[1rem] bg-[#13100d]">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)]" />
                  <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                </>
              )}
              <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{item.length}</span>
            </div>
            <div className="min-w-0">
              <h2 className="mt-1 line-clamp-3 text-sm font-black leading-5 xl:text-base xl:leading-6">{item.title}</h2>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5d5248] dark:text-[#d5c8bc]">{item.note}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#6f6255] dark:text-[#d5c8bc]">
                <span>{formatViewCount(getVideoEngagement(item).views)} views</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span>👍 {getVideoEngagement(item).likes}</span>
                  <span>👎 {getVideoEngagement(item).dislikes}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  ) : null;

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#16120f] dark:bg-[#0f0d0b] dark:text-[#f8f2eb]" style={eventThemeVars}>
      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f6f1ea]/90 backdrop-blur dark:border-white/10 dark:bg-[#0f0d0b]/90">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[auto_minmax(18rem,1fr)_auto] lg:items-center lg:px-8">
          <button
            type="button"
            onClick={() => openPath("/fashion")}
            className="inline-flex items-center gap-3 self-start rounded-2xl px-1 py-1 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <img src={logo} alt="AutoHub logo" className="h-11 w-11 rounded-xl object-cover" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a5e3e] dark:text-[#d5b18b]">AutoHub</p>
              <p className="text-sm font-semibold">Fashion Videos</p>
            </div>
          </button>

          <div className="hidden md:flex flex-col gap-3 lg:items-center">
            <div className="w-full rounded-full border border-black/10 bg-white px-4 py-3 shadow-[0_10px_30px_-22px_rgba(58,36,18,0.24)] dark:border-white/10 dark:bg-[#1a1714]">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search fashion videos"
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#8b7764] dark:placeholder:text-[#9d8a7a]"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-3 lg:justify-end">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOverlayOpen(true);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#1a1714] transition hover:bg-black/5 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              aria-label="Search fashion videos"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
                <circle cx="11" cy="11" r="6.25" strokeWidth="1.8" />
                <path d="M16 16l4 4" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => openPath("/fashion/collections")}
              className="hidden rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white md:inline-flex dark:border-white/10 dark:hover:bg-white/10"
            >
              {collectionsLabel}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
              className="hidden rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white md:inline-flex dark:border-white/10 dark:hover:bg-white/10"
            >
              Cookie settings
            </button>
            <button
              type="button"
              onClick={(event) => {
                setQuickGrabsTrigger(event.currentTarget);
                setQuickGrabsOpen(true);
              }}
              className="hidden rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)] transition hover:translate-y-[-1px] md:inline-flex"
            >
              Advertise with us
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSearchOverlayOpen(false);
                setIsMobileMenuOpen((current) => !current);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#1a1714] transition hover:bg-black/5 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              aria-label="Open actions menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
                <path d="M5 7h14M5 12h14M5 17h14" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {isMobileViewport && isMobileMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.65rem)] z-30 min-w-[13rem] rounded-[1.25rem] border border-black/10 bg-[#f6f1ea] p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-[#171513]">
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openPath("/fashion/collections");
                    }}
                    className="rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                  >
                    {collectionsLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
                    }}
                    className="rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                  >
                    Cookie settings
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      setIsMobileMenuOpen(false);
                      setQuickGrabsTrigger(event.currentTarget);
                      setQuickGrabsOpen(true);
                    }}
                    className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)]"
                  >
                    Advertise with us
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="border-b border-black/6 bg-[#f6f1ea]/88 backdrop-blur dark:border-white/8 dark:bg-[#0f0d0b]/88">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          {browseFilterChips}
        </div>
      </div>

      {isMobileViewport && isSearchOverlayOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" onClick={() => setIsSearchOverlayOpen(false)}>
          <div className="px-4 pt-20 sm:px-6">
            <div
              className="mx-auto max-w-xl rounded-[1.6rem] border border-black/10 bg-[#f6f1ea] p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-[#171513]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1f1b17]">
                  <input
                    ref={mobileSearchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search fashion videos"
                    className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#8b7764] dark:placeholder:text-[#9d8a7a]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchOverlayOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#1a1714] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb]"
                  aria-label="Close search"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        {!videoRecords.length ? (
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-black/8 bg-white/80 p-8 text-center shadow-[0_24px_70px_-42px_rgba(48,35,18,0.28)] dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f6a46] dark:text-[#d6b798]">
            {contentSource === "loading" ? "Loading" : contentSource === "unavailable" ? "Unavailable" : "No videos"}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {contentSource === "loading"
              ? "Loading Fashion videos"
              : contentSource === "unavailable"
                ? "Fashion videos are temporarily unavailable"
                : "No published Fashion videos yet"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#5f544a] dark:text-[#d5c8bc]">
            {contentSource === "loading"
              ? "The page is waiting for the published Fashion video feed."
              : contentSource === "unavailable"
                ? "The published Fashion video feed could not be reached right now. Refresh and try again."
                : "This page is connected to the Fashion video backend correctly, but there are no published video records to render."}
          </p>
        </div>
        ) : (
        <div className="mx-auto max-w-7xl">
          {activeVideo ? (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveVideoId(null);
                  if (isMobileViewport) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onClickCapture={() => setRotationSeed(Math.floor(Date.now() % 2147483647))}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Back to videos
              </button>
            </div>
          ) : null}
          {activeVideo ? (
            <>
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.34fr)_minmax(22rem,0.66fr)]">
                <div className="min-w-0 self-start">
                <article className="h-fit w-full overflow-hidden rounded-[1.8rem] border border-black/8 bg-white p-4 shadow-[0_20px_60px_-38px_rgba(58,36,18,0.2)] dark:border-white/10 dark:bg-[#171513]">
                  <div
                    ref={playerFrameRef}
                    className={`group overflow-hidden bg-[#13100d] ${
                      isPictureInPicture
                        ? "fixed bottom-4 right-4 z-40 h-[10rem] w-[min(18rem,calc(100vw-2rem))] rounded-[1.1rem] border border-black/15 shadow-[0_28px_80px_-30px_rgba(0,0,0,0.65)] dark:border-white/10 sm:bottom-6 sm:right-6 sm:h-[12.5rem] sm:w-[20rem]"
                        : `relative rounded-[1.2rem] ${isLargePlayer ? "h-[13.5rem] sm:h-[22rem] md:h-[24rem] lg:h-[28rem] xl:h-[30rem]" : "h-[11rem] sm:h-[16rem] md:h-[18rem] lg:h-[20rem] xl:h-[22rem]"}`
                    }`}
                  >
                    {activeVideo.videoAssetUrl ? (
                      <video
                        ref={attachPlayerVideoRef}
                        src={activeVideo.videoAssetUrl}
                        poster={activeVideo.thumbnailUrl || undefined}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        muted={effectiveMuted}
                        preload="metadata"
                        onTimeUpdate={(event) => setElapsedSeconds(event.currentTarget.currentTime)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onCanPlay={(event) => {
                          setCanPlayVideoId(activeVideo.id);
                          if (pendingUserPlayVideoIdRef.current === activeVideo.id) {
                            void attemptDirectUserPlayback(event.currentTarget, activeVideo.id, "user-canplay-play");
                          }
                        }}
                        onLoadedMetadata={(event) => {
                          const metadataDuration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
                          setPlayerDurationSeconds(metadataDuration > 0 ? metadataDuration : 0);
                          setElapsedSeconds(event.currentTarget.currentTime);
                        }}
                        onDurationChange={(event) => {
                          const metadataDuration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
                          if (metadataDuration > 0) {
                            setPlayerDurationSeconds(metadataDuration);
                          }
                        }}
                        onEnded={() => {
                          setIsPlaying(false);
                          setElapsedSeconds(activeVideoDurationSeconds);
                        }}
                      />
                    ) : activeVideo.thumbnailUrl ? (
                      <img src={activeVideo.thumbnailUrl} alt={activeVideo.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)]" />
                        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                      </>
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                        `opacity-0 ${hoverRevealClassName}`
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void togglePlayback()}
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                        className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/50"
                      >
                        {isPlaying ? (
                          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden="true">
                            <path d="M7 6h3v12H7zm7 0h3v12h-3z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden="true">
                            <path d="M8 6.5v11l9-5.5-9-5.5Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {playerFeedback ? (
                      <div className="pointer-events-none absolute inset-x-0 top-5 z-20 flex justify-center px-4">
                        <div className="rounded-[1rem] border border-white/15 bg-black/55 px-4 py-2 text-center text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,0.55)] backdrop-blur-md">
                          <p className="text-base font-black tracking-[-0.03em]">{playerFeedback.label}</p>
                          {playerFeedback.detail ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">{playerFeedback.detail}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className={`pointer-events-none absolute inset-x-0 bottom-0 opacity-0 transition duration-200 ${hoverRevealClassName}`}>
                      <div className="bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.72)_55%,rgba(0,0,0,0.92)_100%)] px-4 pb-4 pt-10">
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          const nextRatio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
                          const nextSeconds = Math.round(Math.max(0, Math.min(nextRatio, 1)) * activeVideoDurationSeconds);
                          setElapsedSeconds(nextSeconds);
                          if (playerVideoRef.current && activeVideo?.videoAssetUrl) {
                            playerVideoRef.current.currentTime = nextSeconds;
                          }
                        }}
                        className="pointer-events-auto mb-3 block w-full"
                        aria-label="Seek video"
                      >
                        <div className={`${isPictureInPicture ? "h-1" : "h-1.5"} rounded-full bg-white/20`}>
                          <div className="h-1.5 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)]" style={{ width: `${progressRatio * 100}%` }} />
                        </div>
                      </button>
                      <div className={`flex items-center text-white ${isPictureInPicture ? "gap-2" : "flex-wrap gap-3"}`}>
                        <button
                          type="button"
                          onClick={() => void togglePlayback()}
                          aria-label={isPlaying ? "Pause video" : "Play video"}
                          className={primaryControlButtonClassName}
                        >
                          {isPlaying ? (
                            <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-current`} aria-hidden="true">
                              <path d="M7 6h3v12H7zm7 0h3v12h-3z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-current`} aria-hidden="true">
                              <path d="M8 6.5v11l9-5.5-9-5.5Z" />
                            </svg>
                          )}
                        </button>
                        <span className={`${isPictureInPicture ? "min-w-[4.6rem] text-[10px]" : "text-xs"} font-semibold text-white/85`}>{formatVideoTime(elapsedSeconds)} / {activeVideoDurationLabel}</span>
                        <div className={`ml-auto flex items-center ${isPictureInPicture ? "gap-1.5" : "gap-3"}`}>
                          <div className={`pointer-events-auto flex items-center ${isPictureInPicture ? "gap-1.5" : "gap-2"}`}>
                          <button
                            type="button"
                            onClick={() => {
                              if (autoMutedForPlayback) {
                                setAutoMutedForPlayback(false);
                                setIsMuted(false);
                                return;
                              }
                              setIsMuted((current) => !current);
                            }}
                            aria-label="Volume controls"
                            className={controlButtonClassName}
                          >
                            {effectiveMuted ? (
                              <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-none stroke-current`} aria-hidden="true">
                                <path d="M5 10h3l4-4v12l-4-4H5z" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M16 9l5 5M21 9l-5 5" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-current`} aria-hidden="true">
                                <path d="M5 10h3l4-4v12l-4-4H5z" />
                                <path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={effectiveMuted ? 0 : volumePercent}
                            onChange={(event) => handleVolumeChange(Number(event.target.value) / 100)}
                            aria-label="Volume"
                            className={`${isPictureInPicture ? "w-14" : "w-20"} accent-white`}
                          />
                          </div>
                          {isPictureInPicture ? (
                            <button
                              type="button"
                              onClick={() => setIsPictureInPicture(false)}
                              aria-label="Return from picture in picture"
                              className={controlButtonClassName}
                            >
                              <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-none stroke-current`} aria-hidden="true">
                                <rect x="4" y="6" width="16" height="12" rx="1.8" strokeWidth="1.8" />
                                <path d="M9 12h6M9 12l2.5-2.5M9 12l2.5 2.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setIsPictureInPicture((current) => !current)}
                                aria-label={isPictureInPicture ? "Exit picture in picture" : "Picture in picture"}
                                className={controlButtonClassName}
                              >
                                <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-none stroke-current`} aria-hidden="true">
                                  <rect x="4" y="6" width="16" height="12" rx="1.8" strokeWidth="1.8" />
                                  <rect x="12.5" y="10.5" width="5" height="4" rx="0.8" fill="currentColor" stroke="none" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsLargePlayer((current) => !current)}
                                aria-label={isLargePlayer ? "Shrink player" : "Expand player"}
                                className={controlButtonClassName}
                              >
                                {isLargePlayer ? (
                                  <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-none stroke-current`} aria-hidden="true">
                                    <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-none stroke-current`} aria-hidden="true">
                                    <path d="M9 9H4V4M15 9h5V4M20 15v5h-5M9 15H4v5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => void toggleFullscreen()}
                                aria-label="Fullscreen"
                                className={controlButtonClassName}
                              >
                                <svg viewBox="0 0 24 24" className={`${controlIconClassName} fill-none stroke-current`} aria-hidden="true">
                                  <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                    <span className={`absolute bottom-4 right-4 rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white transition-all duration-200 ${isPictureInPicture ? "group-hover:bottom-16" : "group-hover:bottom-20 group-focus-within:bottom-20"}`}>{activeVideoDurationLabel}</span>
                    {effectiveMuted ? (
                      <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                        Muted
                      </span>
                    ) : null}
                    {isPictureInPicture ? (
                      <button
                        type="button"
                        onClick={() => setIsPictureInPicture(false)}
                        className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity duration-200 ${hoverRevealClassName} sm:right-3 sm:top-3 sm:h-8 sm:w-8`}
                        aria-label="Close picture in picture"
                      >
                        <svg viewBox="0 0 24 24" className={`${isPictureInPicture ? "h-3.5 w-3.5" : "h-4 w-4"} fill-none stroke-current`} aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : null}
                    {hasPlaybackEnded ? (
                      <div className="absolute inset-0 z-20 flex items-end bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.7)_45%,rgba(0,0,0,0.92)_100%)] p-4 sm:p-5">
                        <div className="w-full rounded-[1.2rem] border border-white/10 bg-black/45 p-4 text-white backdrop-blur-md">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Up next</p>
                              <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Choose another video fast.</h2>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setElapsedSeconds(0);
                                if (playerVideoRef.current) {
                                  playerVideoRef.current.currentTime = 0;
                                }
                                void togglePlayback();
                              }}
                              className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#171513]"
                            >
                              Replay
                            </button>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {endScreenVideos.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => openVideo(item.id)}
                                className="overflow-hidden rounded-[1rem] border border-white/10 bg-white/10 text-left transition hover:bg-white/15"
                              >
                                <div className="relative aspect-video bg-[#13100d]">
                                  {item.thumbnailUrl ? (
                                    <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                                  ) : null}
                                  <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{item.length}</span>
                                </div>
                                <div className="p-3">
                                  <p className="line-clamp-2 text-sm font-black leading-5">{item.title}</p>
                                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">{item.collection}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="px-1 pb-2 pt-5">
                    <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-[2rem]">{activeVideo.title}</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d5248] dark:text-[#d5c8bc]">{activeVideo.note}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#6f6255] dark:text-[#d5c8bc]">
                      <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                        {formatViewCount(activeVideoStats?.views ?? activeVideo.viewCount)} views
                      </span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReactionToggle(activeVideo, "like")}
                          className={`rounded-full border px-3 py-1 ${
                            activeVideoStats?.reaction === "like"
                              ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                              : "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          }`}
                        >
                          👍 {activeVideoStats?.likes ?? activeVideo.likes}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReactionToggle(activeVideo, "dislike")}
                          className={`rounded-full border px-3 py-1 ${
                            activeVideoStats?.reaction === "dislike"
                              ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                              : "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                          }`}
                        >
                          👎 {activeVideoStats?.dislikes ?? activeVideo.dislikes}
                        </button>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeVideoCheckoutProduct || !activeVideo) return;
                          void openFashionProductCheckout(activeVideoCheckoutProduct, activeVideo.sourceLabel || `Fashion videos ${activeVideo.id}`);
                        }}
                        className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)] transition hover:translate-y-[-1px]"
                      >
                        {activeVideo.checkoutLabel || "Check out"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          if (!activeVideoProduct) return;
                          setProductTrigger(event.currentTarget);
                          setSelectedProduct(activeVideoProduct);
                        }}
                        className="rounded-full border border-black/10 bg-[#f8f3ec] px-5 py-2.5 text-sm font-semibold text-[#2f241c] transition hover:bg-[#efe5d7] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                      >
                        More items like this
                      </button>
                    </div>
                  </div>
                </article>

                <section className="relative mt-5 rounded-[1.8rem] border border-black/8 bg-white px-5 py-5 shadow-[0_18px_52px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]" style={commentFontStyle}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#7a5e3e] dark:text-[#d5b18b]">Comments</h2>
                      {hasMobileCommentRail ? (
                        <span className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                          Fresh
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setCommentComposerOpen((current) => !current);
                          setReplyParentCommentId(null);
                          setReplyParentCommentName("");
                          setCommentError("");
                        }}
                        className="rounded-full border border-black/10 bg-[#f8f3ec] px-4 py-2 text-sm font-semibold text-[#2f241c] transition hover:bg-[#efe5d7] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                      >
                        Comment
                      </button>
                      {commentComposerOpen ? (
                        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(34rem,calc(100vw-4rem))] rounded-[1.3rem] border border-black/10 bg-[rgba(248,243,236,0.86)] p-4 shadow-[0_24px_50px_-30px_rgba(58,36,18,0.38)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(30,26,23,0.86)]">
                          <div className="grid gap-4">
                            {replyParentCommentId ? (
                              <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-sm font-medium text-[#5d5248] dark:border-white/10 dark:bg-white/5 dark:text-[#d5c8bc]">
                                <span>Replying to {replyParentCommentName || "comment"}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyParentCommentId(null);
                                    setReplyParentCommentName("");
                                  }}
                                  className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold dark:border-white/10"
                                >
                                  Cancel reply
                                </button>
                              </div>
                            ) : null}
                            <label className="grid gap-2">
                              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a5e3e] dark:text-[#d5b18b]">Name</span>
                              <input
                                type="text"
                                value={commentName}
                                onChange={(event) => setCommentName(event.target.value)}
                                placeholder="Your name"
                                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a5e3e] dark:text-[#d5b18b]">{replyParentCommentId ? "Reply" : "Comment"}</span>
                              <textarea
                                rows={4}
                                value={commentText}
                                onChange={(event) => setCommentText(event.target.value)}
                                placeholder={replyParentCommentId ? "Write your reply" : "Write your comment"}
                                className="resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]"
                              />
                            </label>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              Links to outside sites are not allowed in comments or replies. If you paste one, it will be removed automatically when saved.
                            </p>
                            {commentError ? <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{commentError}</p> : null}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCommentSubmit()}
                                disabled={commentSubmitting}
                                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1f1812] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                              >
                                {commentSubmitting ? "Posting..." : replyParentCommentId ? "Post reply" : "Post comment"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommentComposerOpen(false);
                                  setReplyParentCommentId(null);
                                  setReplyParentCommentName("");
                                }}
                                className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-4 py-2 text-sm font-semibold text-white"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {hasMobileCommentRail ? (
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5e3e] dark:text-[#d5b18b]">
                      Fresh comments are in a scroll rail after the first five.
                    </p>
                  ) : null}
                  <div className={`mt-5 space-y-5 ${hasMobileCommentRail ? "max-h-[28rem] overflow-y-auto overscroll-contain pr-1.5" : ""}`}>
                    {activeCommentThread.map((comment) => (
                      <article key={comment.id} className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-bold text-white">
                          {comment.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1f1812] dark:text-[#f8f2eb]">
                            {comment.name}
                            {comment.createdAt ? (
                              <span className="ml-2 text-xs font-medium text-[#8a7764] dark:text-[#ad9987]">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[#5d5248] dark:text-[#d5c8bc]">{comment.text}</p>
                          {comment.id !== "empty-comment" ? (
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => void handleCommentReactionToggle(comment.id, "like")}
                                aria-label="Like comment"
                                className={`inline-flex items-center gap-1.5 text-[#4a3f35] transition hover:text-emerald-600 dark:text-[#d5c8bc] dark:hover:text-emerald-300 ${
                                  comment.reaction === "like" ? "text-emerald-600 dark:text-emerald-300" : ""
                                }`}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                  <path d="M14 9V5.5C14 4.12 13.18 3 12 3l-4.2 6.12A2 2 0 0 0 7.5 10.3V19a2 2 0 0 0 2 2H17a2 2 0 0 0 1.94-1.5l1.5-6A2 2 0 0 0 18.5 11H15a1 1 0 0 1-1-1Z" />
                                  <path d="M4 10h3v11H4z" />
                                </svg>
                                <span>{comment.likes ?? 0}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCommentReactionToggle(comment.id, "dislike")}
                                aria-label="Dislike comment"
                                className={`inline-flex items-center gap-1.5 text-[#4a3f35] transition hover:text-rose-600 dark:text-[#d5c8bc] dark:hover:text-rose-300 ${
                                  comment.reaction === "dislike" ? "text-rose-600 dark:text-rose-300" : ""
                                }`}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                  <path d="M10 15v3.5c0 1.38.82 2.5 2 2.5l4.2-6.12a2 2 0 0 0 .3-1.18V5a2 2 0 0 0-2-2H7a2 2 0 0 0-1.94 1.5l-1.5 6A2 2 0 0 0 5.5 13H9a1 1 0 0 1 1 1Z" />
                                  <path d="M17 3h3v11h-3z" />
                                </svg>
                                <span>{comment.dislikes ?? 0}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommentComposerOpen(true);
                                  setReplyParentCommentId(comment.id);
                                  setReplyParentCommentName(comment.name);
                                  setCommentError("");
                                  setCommentText("");
                                }}
                                className="rounded-full border border-black/10 bg-white px-3 py-1 text-[#4a3f35] dark:border-white/10 dark:bg-white/5 dark:text-[#d5c8bc]"
                              >
                                Reply
                              </button>
                            </div>
                          ) : null}
                          {comment.replies?.length ? (
                            <div className="mt-4 space-y-4 border-l border-black/10 pl-4 dark:border-white/10">
                              {comment.replies.map((reply) => (
                                <article key={reply.id} className="flex gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6] text-xs font-bold text-white">
                                    {reply.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-[#1f1812] dark:text-[#f8f2eb]">
                                      {reply.name}
                                      {reply.createdAt ? (
                                        <span className="ml-2 text-xs font-medium text-[#8a7764] dark:text-[#ad9987]">
                                          {new Date(reply.createdAt).toLocaleDateString()}
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="mt-2 text-sm leading-7 text-[#5d5248] dark:text-[#d5c8bc]">{reply.text}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
                                      <button
                                        type="button"
                                        onClick={() => void handleCommentReactionToggle(reply.id, "like")}
                                        aria-label="Like reply"
                                        className={`inline-flex items-center gap-1.5 text-[#4a3f35] transition hover:text-emerald-600 dark:text-[#d5c8bc] dark:hover:text-emerald-300 ${
                                          reply.reaction === "like" ? "text-emerald-600 dark:text-emerald-300" : ""
                                        }`}
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                          <path d="M14 9V5.5C14 4.12 13.18 3 12 3l-4.2 6.12A2 2 0 0 0 7.5 10.3V19a2 2 0 0 0 2 2H17a2 2 0 0 0 1.94-1.5l1.5-6A2 2 0 0 0 18.5 11H15a1 1 0 0 1-1-1Z" />
                                          <path d="M4 10h3v11H4z" />
                                        </svg>
                                        <span>{reply.likes ?? 0}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleCommentReactionToggle(reply.id, "dislike")}
                                        aria-label="Dislike reply"
                                        className={`inline-flex items-center gap-1.5 text-[#4a3f35] transition hover:text-rose-600 dark:text-[#d5c8bc] dark:hover:text-rose-300 ${
                                          reply.reaction === "dislike" ? "text-rose-600 dark:text-rose-300" : ""
                                        }`}
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                          <path d="M10 15v3.5c0 1.38.82 2.5 2 2.5l4.2-6.12a2 2 0 0 0 .3-1.18V5a2 2 0 0 0-2-2H7a2 2 0 0 0-1.94 1.5l-1.5 6A2 2 0 0 0 5.5 13H9a1 1 0 0 1 1 1Z" />
                                          <path d="M17 3h3v11h-3z" />
                                        </svg>
                                        <span>{reply.dislikes ?? 0}</span>
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

                {!isMobileViewport ? suggestedVideosPanel : null}
              </div>
              {isMobileViewport ? <div className="mt-5">{suggestedVideosPanel}</div> : null}
            </>
          ) : (
            <div
              className="grid gap-4 lg:gap-5"
              style={{ gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(auto-fit, minmax(15.5rem, 1fr))" }}
            >
              {visibleVideoCards.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openVideo(item.id)}
                  className="min-w-0 overflow-hidden rounded-[1.5rem] border border-black/8 bg-white p-3 text-left shadow-[0_16px_40px_-34px_rgba(58,36,18,0.18)] transition hover:border-[#b68b62]/40 hover:bg-[#fdf9f4] dark:border-white/10 dark:bg-[#171513] dark:hover:border-[#d5b18b]/40 dark:hover:bg-[#1d1916]"
                  style={{ animation: `fadeUp ${0.28 + index * 0.04}s ease-out` }}
                >
                  <div className="relative aspect-video overflow-hidden rounded-[1rem] bg-[#13100d]">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)]" />
                        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                      </>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{item.length}</span>
                  </div>
                  <div className="min-w-0 px-1 pb-1 pt-4">
                    <h2 className="mt-2 line-clamp-2 text-sm font-black leading-5 sm:text-base sm:leading-6">{item.title}</h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5d5248] dark:text-[#d5c8bc]">{item.note}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#6f6255] dark:text-[#d5c8bc]">
                      <span>{formatViewCount(getVideoEngagement(item).views)} views</span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span>👍 {getVideoEngagement(item).likes}</span>
                        <span>👎 {getVideoEngagement(item).dislikes}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </main>

      <QuickGrabsModal
        open={quickGrabsOpen}
        onClose={() => setQuickGrabsOpen(false)}
        returnFocusTo={quickGrabsTrigger}
        subscribeSource="fashion_videos_advertise"
      />
      <FashionProductModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        onClose={() => setSelectedProduct(null)}
        returnFocusTo={productTrigger}
        sourceLabel="Fashion videos more items like this"
      />
    </div>
  );
};

export default FashionVideos;
