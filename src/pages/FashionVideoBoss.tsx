import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import logo from "../assets/logo.png";
import { featuredFashionProducts, trendRail } from "../data/fashionCatalog";
import { getInitialTheme, type Theme } from "../utils/theme";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { getFashionClientViewModel } from "../utils/fashionDraft";
import { withBasePath } from "../utils/basePath";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";
import {
  deleteFashionVideoAsync,
  getFashionVideoAdminInitialContentAsync,
  getFashionVideoAnalyticsSummaryAsync,
  getFashionVideoEngagementAdminSummaryAsync,
  moderateFashionVideoCommentAsync,
  publishFashionVideoContent,
  reorderFashionVideoAsync,
  saveFashionVideoDraftContent,
  toggleFashionVideoPromoteAsync,
  updateFashionVideoPlacementAsync,
  type FashionVideoAnalyticsSummary,
  type FashionVideoEngagementAdminSummary
} from "../utils/fashionVideoAdminStorage";
import {
  uploadFashionVideoAssetWithProgress,
  uploadFashionVideoThumbnailWithProgress,
  type FashionVideoUploadAsset
} from "../utils/fashionVideoMedia";
import {
  validateFashionVideoContentForAdmin,
  validateFashionVideoRecordForAdmin,
  type FashionVideoValidationIssue
} from "../utils/fashionVideoValidation";
import type { FashionVideoContent, FashionVideoPlacement, FashionVideoRecord } from "../../shared/fashionTypes";

const openPath = (path: string) => {
  window.history.pushState({}, "", withBasePath(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const publishStages = [
  "Draft videos",
  "Preview watch layout",
  "Validate product mapping",
  "Review engagement UI",
  "Publish after backend"
] as const;

const navSections = [
  {
    title: "Video admin",
    links: [
      { label: "Overview", href: "/boss/fashion/videos", key: "overview" },
      { label: "Uploads systems", href: "/boss/fashion/videos/uploads", key: "uploads" },
      { label: "Video library", href: "/boss/fashion/videos/library", key: "library" },
      { label: "Commerce and comments", href: "/boss/fashion/videos/commerce", key: "commerce" },
      { label: "Preview surfaces", href: "/boss/fashion/videos/previews", key: "previews" }
    ]
  },
  {
    title: "Live pages",
    links: [
      { label: "Fashion videos", href: "/fashion/videos" },
      { label: "Fashion landing", href: "/fashion" },
      { label: "Collections", href: "/fashion/collections" }
    ]
  },
  {
    title: "Outer pages",
    links: [
      { label: "Fashion admin", href: "/boss/fashion" },
      { label: "Main admin", href: "/admin" },
      { label: "Login", href: "/login" }
    ]
  }
] as const;

const rawBase = import.meta.env.BASE_URL || "/";
const trimmedBase = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
const appBasePath = !trimmedBase || trimmedBase === "/" ? "" : trimmedBase;

const getVideoAdminWorkspace = () => {
  if (typeof window === "undefined") return "overview";
  const pathname = window.location.pathname;
  const appPath = appBasePath && pathname.startsWith(appBasePath) ? pathname.slice(appBasePath.length) || "/" : pathname;
  if (appPath === "/boss/fashion/videos/library") return "library";
  if (appPath === "/boss/fashion/videos/uploads") return "uploads";
  if (appPath === "/boss/fashion/videos/commerce") return "commerce";
  if (appPath === "/boss/fashion/videos/previews") return "previews";
  return "overview";
};

type UploadThumbnailDraft = {
  id: string;
  name: string;
  tone: string;
  url: string;
};

type UploadVideoAssetDraft = {
  id: string;
  name: string;
  url: string;
  mime: string;
};

const formatVideoDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return hours > 0
    ? [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
    : [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const deriveVideoMediaInBrowser = (file: File) =>
  new Promise<{ duration: string | null; thumbnailFile: File | null }>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (value: { duration: string | null; thumbnailFile: File | null }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const captureFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext("2d");
        if (!context) {
          finish({ duration: formatVideoDuration(video.duration), thumbnailFile: null });
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              finish({ duration: formatVideoDuration(video.duration), thumbnailFile: null });
              return;
            }
            const thumbnailFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "video"}-thumbnail.jpg`, {
              type: "image/jpeg"
            });
            finish({
              duration: formatVideoDuration(video.duration),
              thumbnailFile
            });
          },
          "image/jpeg",
          0.86
        );
      } catch {
        finish({ duration: formatVideoDuration(video.duration), thumbnailFile: null });
      }
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const totalSeconds = video.duration || 0;
      if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
        finish({ duration: null, thumbnailFile: null });
        return;
      }
      const targetTime = Math.min(Math.max(totalSeconds * 0.15, 0.1), Math.max(totalSeconds - 0.1, 0.1));
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        captureFrame();
      };
      video.addEventListener("seeked", onSeeked, { once: true });
      window.setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        captureFrame();
      }, 2000);
      try {
        video.currentTime = targetTime;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        captureFrame();
      }
    };
    video.onerror = () => finish({ duration: null, thumbnailFile: null });
    video.src = objectUrl;
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read thumbnail preview."));
    reader.readAsDataURL(file);
  });

const formatVideoStatusLabel = (status: FashionVideoRecord["status"]) => (status === "published" ? "Published" : "Draft");

const FashionVideoBoss = () => {
  const [theme] = useState<Theme>(() => getInitialTheme());
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const [videoContent, setVideoContent] = useState<FashionVideoContent>({ videos: [] });
  const [isBootstrappingVideos, setIsBootstrappingVideos] = useState(true);
  const [isSavingVideoDraft, setIsSavingVideoDraft] = useState(false);
  const [isPublishingVideoDraft, setIsPublishingVideoDraft] = useState(false);
  const [videoActionMessage, setVideoActionMessage] = useState("");
  const [videoRequestError, setVideoRequestError] = useState("");
  const [isUploadOverlayOpen, setIsUploadOverlayOpen] = useState(false);
  const [isUploadFlowStagesOpen, setIsUploadFlowStagesOpen] = useState(false);
  const [editingUploadVideoId, setEditingUploadVideoId] = useState("");
  const [videoEngagementSummary, setVideoEngagementSummary] = useState<FashionVideoEngagementAdminSummary>({
    totals: { views: 0, likes: 0, dislikes: 0, comments: 0 },
    byVideo: []
  });
  const [videoAnalyticsSummary, setVideoAnalyticsSummary] = useState<FashionVideoAnalyticsSummary>({
    totals: {
      totalVideos: 0,
      draftVideos: 0,
      publishedVideos: 0,
      promotedVideos: 0,
      mappedVideos: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
      comments: 0
    },
    trends: { views: [], engagement: [], publishPulse: [] },
    recommendations: [],
    topVideos: []
  });
  const [isModeratingComment, setIsModeratingComment] = useState(false);
  const [isLibraryMutating, setIsLibraryMutating] = useState(false);
  const [isLibrarySupportOpen, setIsLibrarySupportOpen] = useState(false);
  const [libraryDetailsVideoId, setLibraryDetailsVideoId] = useState("");
  const [libraryEditTitle, setLibraryEditTitle] = useState("");
  const [libraryEditDescription, setLibraryEditDescription] = useState("");
  const [libraryEditSeries, setLibraryEditSeries] = useState("");
  const [libraryEditPlacement, setLibraryEditPlacement] = useState<FashionVideoPlacement>("feed");
  const [libraryEditMappedProductId, setLibraryEditMappedProductId] = useState("");
  const [libraryEditCollection, setLibraryEditCollection] = useState("");
  const [libraryEditCategory, setLibraryEditCategory] = useState("");
  const [libraryEditTone, setLibraryEditTone] = useState("");
  const [libraryEditCheckoutLabel, setLibraryEditCheckoutLabel] = useState("");
  const [libraryEditSourceLabel, setLibraryEditSourceLabel] = useState("");
  const [libraryEditWhatsAppNumber, setLibraryEditWhatsAppNumber] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadDuration, setUploadDuration] = useState("");
  const [uploadSeries, setUploadSeries] = useState("Campaign motion");
  const [uploadPlacement, setUploadPlacement] = useState<FashionVideoPlacement>("feed");
  const [uploadCollection, setUploadCollection] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadTone, setUploadTone] = useState("");
  const [uploadMappedProductId, setUploadMappedProductId] = useState("");
  const [uploadWhatsAppNumber, setUploadWhatsAppNumber] = useState("");
  const [uploadCheckoutLabel, setUploadCheckoutLabel] = useState("Check out");
  const [uploadSourceLabel, setUploadSourceLabel] = useState("Fashion videos upload");
  const [uploadVideoAsset, setUploadVideoAsset] = useState<UploadVideoAssetDraft | null>(null);
  const [uploadThumbnail, setUploadThumbnail] = useState<UploadThumbnailDraft | null>(null);
  const [uploadVideoProgress, setUploadVideoProgress] = useState<number | null>(null);
  const [uploadThumbnailProgress, setUploadThumbnailProgress] = useState<number | null>(null);
  const [uploadVideoPreviewUrl, setUploadVideoPreviewUrl] = useState("");
  const [uploadSelectedVideoName, setUploadSelectedVideoName] = useState("");
  const [uploadThumbnailPreviewUrl, setUploadThumbnailPreviewUrl] = useState("");
  const [uploadSelectedThumbnailName, setUploadSelectedThumbnailName] = useState("");
  const [isUploadPreviewPlaying, setIsUploadPreviewPlaying] = useState(false);
  const [uploadVideoRemotePreviewUrl, setUploadVideoRemotePreviewUrl] = useState("");
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const eventThemeVars = useMemo(() => getEventThemeCssVars("none", theme) as CSSProperties, [theme]);
  const selectSurfaceStyle = useMemo<CSSProperties>(
    () => ({
      backgroundColor: theme === "dark" ? "#171513" : "#ffffff",
      color: theme === "dark" ? "#f8f2eb" : "#1f1812"
    }),
    [theme]
  );
  const allProducts = useMemo(
    () => (fashionViewModel.productCatalog?.length ? fashionViewModel.productCatalog : [...featuredFashionProducts, ...trendRail]),
    [fashionViewModel]
  );

  useFashionPublishedSync(setFashionViewModel, undefined, { strictBackendOnly: true });

  useEffect(() => {
    let active = true;
    const loadVideoAdminContent = async () => {
      setIsBootstrappingVideos(true);
      try {
        const content = await getFashionVideoAdminInitialContentAsync();
        if (!active) return;
        setVideoContent(content);
        setVideoRequestError("");
      } catch (error) {
        if (!active) return;
        setVideoRequestError(error instanceof Error ? error.message : "Failed to load fashion video draft.");
      } finally {
        if (active) setIsBootstrappingVideos(false);
      }
    };
    void loadVideoAdminContent();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadEngagementSummary = async () => {
      try {
        const summary = await getFashionVideoEngagementAdminSummaryAsync();
        if (!active) return;
        setVideoEngagementSummary(summary);
      } catch {
        if (!active) return;
      }
    };
    void loadEngagementSummary();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAnalyticsSummary = async () => {
      try {
        const summary = await getFashionVideoAnalyticsSummaryAsync();
        if (!active) return;
        setVideoAnalyticsSummary(summary);
      } catch {
        if (!active) return;
      }
    };
    void loadAnalyticsSummary();
    return () => {
      active = false;
    };
  }, []);

  const mappedVideos = useMemo(
    () =>
      videoContent.videos.map((video) => ({
        ...video,
        productName: allProducts.find((product) => product.id === video.mappedProductId)?.name ?? "No mapped product",
        productCollection: allProducts.find((product) => product.id === video.mappedProductId)?.collection ?? "No collection",
        badge: video.placement === "landing" ? "Landing" : video.placement === "promoted" ? "Promoted" : video.placement === "series" ? "Series" : "Feed",
        engagement: videoEngagementSummary.byVideo.find((item) => item.videoId === video.id) ?? null
      })),
    [allProducts, videoContent.videos, videoEngagementSummary.byVideo]
  );
  const collectionOptions = useMemo(() => Array.from(new Set(allProducts.map((product) => product.collection))).slice(0, 6), [allProducts]);
  const categoryOptions = useMemo(() => Array.from(new Set(allProducts.map((product) => product.category))).slice(0, 6), [allProducts]);
  const toneOptions = useMemo(() => Array.from(new Set(allProducts.map((product) => product.tone))).slice(0, 6), [allProducts]);
  const styleTagOptions = useMemo(() => Array.from(new Set(allProducts.flatMap((product) => product.styleTags))).slice(0, 12), [allProducts]);
  const selectedMappedProduct = useMemo(
    () => allProducts.find((product) => product.id === uploadMappedProductId) ?? allProducts[0] ?? null,
    [allProducts, uploadMappedProductId]
  );
  const fallbackVideoWhatsAppNumber = fashionViewModel.whatsapp?.phoneNumber ?? "";
  const workspace = getVideoAdminWorkspace();
  const activeVideoLink = navSections[0].links.find((link) => link.key === workspace)?.label ?? "Overview";
  const videoValidationIssues = useMemo(
    () => validateFashionVideoContentForAdmin(videoContent, fallbackVideoWhatsAppNumber),
    [videoContent, fallbackVideoWhatsAppNumber]
  );
  const issuesByVideoId = useMemo(
    () =>
      videoValidationIssues.reduce<Record<string, FashionVideoValidationIssue[]>>((acc, issue) => {
        acc[issue.videoId] = [...(acc[issue.videoId] ?? []), issue];
        return acc;
      }, {}),
    [videoValidationIssues]
  );
  const libraryDetailsVideo = useMemo(
    () => mappedVideos.find((video) => video.id === libraryDetailsVideoId) ?? null,
    [libraryDetailsVideoId, mappedVideos]
  );
  const libraryDetailsMappedProduct = useMemo(
    () => allProducts.find((product) => product.id === libraryEditMappedProductId) ?? null,
    [allProducts, libraryEditMappedProductId]
  );
  const uploadDraftPreviewIssues = useMemo(() => {
    if (!selectedMappedProduct) return ["Fashion products are required before saving video drafts."];
    const draftRecord: FashionVideoRecord = {
      id: "preview-upload",
      title: uploadTitle.trim(),
      description: uploadDescription.trim(),
      duration: uploadDuration.trim(),
      thumbnail: uploadThumbnail?.url ?? "",
      videoAsset: uploadVideoAsset?.url ?? "",
      views: 0,
      likes: 0,
      dislikes: 0,
      comments: [],
      status: "draft",
      placement: uploadPlacement,
      series: uploadSeries.trim(),
      mappedProductId: uploadMappedProductId || selectedMappedProduct.id,
      collection: uploadCollection || selectedMappedProduct.collection,
      category: uploadCategory || selectedMappedProduct.category,
      tone: uploadTone || selectedMappedProduct.tone,
      styleTags: selectedMappedProduct.styleTags?.length ? selectedMappedProduct.styleTags : [],
      whatsappNumber: uploadWhatsAppNumber.trim(),
      checkoutLabel: uploadCheckoutLabel.trim(),
      sourceLabel: uploadSourceLabel.trim(),
      isPromoted: uploadPlacement === "promoted",
      sortOrder: videoContent.videos.length + 1
    };
    return validateFashionVideoRecordForAdmin(draftRecord, fallbackVideoWhatsAppNumber).map((issue) => issue.message);
  }, [
    fallbackVideoWhatsAppNumber,
    selectedMappedProduct,
    uploadTitle,
    uploadDescription,
    uploadDuration,
    uploadThumbnail,
    uploadVideoAsset,
    uploadPlacement,
    uploadSeries,
    uploadMappedProductId,
    uploadCollection,
    uploadCategory,
    uploadTone,
    uploadWhatsAppNumber,
    uploadCheckoutLabel,
    uploadSourceLabel,
    videoContent.videos.length
  ]);

  useEffect(() => {
    if (!allProducts.length) return;
    if (!uploadMappedProductId) setUploadMappedProductId(allProducts[0].id);
    if (!uploadCollection) setUploadCollection(collectionOptions[0] ?? allProducts[0].collection);
    if (!uploadCategory) setUploadCategory(categoryOptions[0] ?? allProducts[0].category);
    if (!uploadTone) setUploadTone(toneOptions[0] ?? allProducts[0].tone);
  }, [allProducts, categoryOptions, collectionOptions, toneOptions, uploadCategory, uploadCollection, uploadMappedProductId, uploadTone]);

  const resetUploadForm = () => {
    if (uploadVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadVideoPreviewUrl);
    }
    if (uploadPreviewVideoRef.current) {
      uploadPreviewVideoRef.current.pause();
      uploadPreviewVideoRef.current.currentTime = 0;
    }
    setEditingUploadVideoId("");
    setUploadTitle("");
    setUploadDescription("");
    setUploadDuration("");
    setUploadSeries("Campaign motion");
    setUploadPlacement("feed");
    setUploadCollection(collectionOptions[0] ?? allProducts[0]?.collection ?? "");
    setUploadCategory(categoryOptions[0] ?? allProducts[0]?.category ?? "");
    setUploadTone(toneOptions[0] ?? allProducts[0]?.tone ?? "");
    setUploadMappedProductId(allProducts[0]?.id ?? "");
    setUploadWhatsAppNumber("");
    setUploadCheckoutLabel("Check out");
    setUploadSourceLabel("Fashion videos upload");
    setUploadVideoAsset(null);
    setUploadThumbnail(null);
    setUploadVideoProgress(null);
    setUploadThumbnailProgress(null);
    setUploadVideoPreviewUrl("");
    setUploadVideoRemotePreviewUrl("");
    setUploadSelectedVideoName("");
    setUploadThumbnailPreviewUrl("");
    setUploadSelectedThumbnailName("");
    setIsUploadPreviewPlaying(false);
  };

  const openUploadEditor = (video?: FashionVideoRecord | null) => {
    if (!video) {
      resetUploadForm();
      setIsUploadOverlayOpen(true);
      return;
    }
    setEditingUploadVideoId(video.id);
    setUploadTitle(video.title);
    setUploadDescription(video.description);
    setUploadDuration(video.duration);
    setUploadSeries(video.series);
    setUploadPlacement(video.placement);
    setUploadCollection(video.collection);
    setUploadCategory(video.category);
    setUploadTone(video.tone);
    setUploadMappedProductId(video.mappedProductId);
    setUploadWhatsAppNumber(video.whatsappNumber);
    setUploadCheckoutLabel(video.checkoutLabel);
    setUploadSourceLabel(video.sourceLabel);
    setUploadVideoAsset(
      video.videoAsset
        ? {
            id: `${video.id}-asset`,
            name: video.videoAsset.split("/").pop() || "Selected video",
            url: video.videoAsset,
            mime: "video/mp4"
          }
        : null
    );
    setUploadVideoPreviewUrl(video.videoAsset ?? "");
    setUploadVideoRemotePreviewUrl(video.videoAsset ?? "");
    setUploadSelectedVideoName(video.videoAsset.split("/").pop() || video.title);
    setUploadThumbnail(
      video.thumbnail
        ? {
            id: `${video.id}-thumbnail`,
            name: video.thumbnail.split("/").pop() || "Selected thumbnail",
            tone: "Uploaded thumbnail",
            url: video.thumbnail
          }
        : null
    );
    setUploadThumbnailPreviewUrl(video.thumbnail ?? "");
    setUploadSelectedThumbnailName(video.thumbnail.split("/").pop() || "Selected thumbnail");
    setUploadVideoProgress(video.videoAsset ? 100 : null);
    setUploadThumbnailProgress(video.thumbnail ? 100 : null);
    setIsUploadOverlayOpen(true);
  };

  const handleSaveUploadDraft = async (publish = false) => {
    const mappedProduct = selectedMappedProduct;
    if (!mappedProduct) {
      setVideoRequestError("Fashion products are required before saving video drafts.");
      return;
    }

    setIsSavingVideoDraft(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const nextVideo: FashionVideoRecord = {
        id: editingUploadVideoId || `upload-${Date.now()}`,
        title: uploadTitle.trim() || `Untitled video ${videoContent.videos.length + 1}`,
        description: uploadDescription.trim() || "No description added yet.",
        duration: uploadDuration.trim() || "00:00",
        thumbnail: uploadThumbnail?.url ?? "",
        videoAsset: uploadVideoAsset?.url ?? "",
        views: 0,
        likes: 0,
        dislikes: 0,
        comments: [],
        status: publish ? "published" : "draft",
        placement: uploadPlacement,
        series: uploadSeries.trim() || "Campaign motion",
        mappedProductId: mappedProduct.id,
        collection: uploadCollection || mappedProduct.collection,
        category: uploadCategory || mappedProduct.category,
        tone: uploadTone || mappedProduct.tone,
        styleTags: mappedProduct.styleTags?.length ? mappedProduct.styleTags : [mappedProduct.category || "fashion"],
        whatsappNumber: uploadWhatsAppNumber.trim(),
        checkoutLabel: uploadCheckoutLabel.trim() || "Check out",
        sourceLabel: uploadSourceLabel.trim() || "Fashion videos upload",
        isPromoted: uploadPlacement === "promoted",
        sortOrder: videoContent.videos.find((video) => video.id === editingUploadVideoId)?.sortOrder ?? videoContent.videos.length + 1
      };
      const candidateIssues = validateFashionVideoRecordForAdmin(nextVideo, fallbackVideoWhatsAppNumber);
      if (candidateIssues.length) {
        setVideoRequestError(candidateIssues[0].message);
        return;
      }
      const nextContent: FashionVideoContent = {
        videos: editingUploadVideoId
          ? videoContent.videos.map((video) =>
              video.id === editingUploadVideoId
                ? { ...nextVideo, status: publish ? "published" : video.status }
                : video
            )
          : [nextVideo, ...videoContent.videos]
      };
      const saved = publish ? await publishFashionVideoContent(nextContent) : await saveFashionVideoDraftContent(nextContent);
      setVideoContent(saved);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      setVideoActionMessage(
        publish
          ? `${editingUploadVideoId ? "Updated and published" : "Saved and published"} "${nextVideo.title}" live.`
          : `${editingUploadVideoId ? "Updated" : "Saved"} "${nextVideo.title}" to fashion video draft.`
      );
      resetUploadForm();
      setIsUploadOverlayOpen(false);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : `Failed to ${publish ? "publish" : "save"} fashion video.`);
    } finally {
      setIsSavingVideoDraft(false);
    }
  };

  const handlePublishUploadedVideo = async (id: string) => {
    setIsPublishingVideoDraft(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const nextContent: FashionVideoContent = {
        videos: videoContent.videos.map((video) =>
          video.id === id
            ? { ...video, status: "published", isPromoted: video.isPromoted || video.placement === "promoted" }
            : video
        )
      };
      const publishIssues = validateFashionVideoContentForAdmin(nextContent, fallbackVideoWhatsAppNumber).filter(
        (issue) => issue.videoId === id
      );
      if (publishIssues.length) {
        setVideoRequestError(publishIssues[0].message);
        return;
      }
      const published = await publishFashionVideoContent(nextContent);
      setVideoContent(published);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      const publishedVideo = published.videos.find((video) => video.id === id);
      setVideoActionMessage(`Published "${publishedVideo?.title ?? "video"}" live.`);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to publish fashion video.");
    } finally {
      setIsPublishingVideoDraft(false);
    }
  };

  const applyUploadedVideoAsset = (item: FashionVideoUploadAsset) => {
    setUploadVideoAsset({
      id: item.id,
      name: item.name,
      url: item.url,
      mime: item.mime
    });
    setUploadVideoRemotePreviewUrl(item.url);
    setUploadVideoProgress(100);
    setVideoActionMessage(`Selected video asset "${item.name}".`);
    setVideoRequestError("");
  };

  const toggleUploadPreviewPlayback = async () => {
    const video = uploadPreviewVideoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      try {
        await video.play();
        setIsUploadPreviewPlaying(true);
      } catch {
        setIsUploadPreviewPlaying(false);
      }
      return;
    }
    video.pause();
    setIsUploadPreviewPlaying(false);
  };

  const applyUploadedThumbnailAsset = (item: FashionVideoUploadAsset) => {
    setUploadThumbnail({
      id: item.id,
      name: item.name,
      tone: "Uploaded thumbnail",
      url: item.url
    });
    setUploadThumbnailPreviewUrl((currentValue) => (currentValue ? currentValue : item.url));
    setUploadSelectedThumbnailName(item.name);
    setUploadThumbnailProgress(100);
    setVideoActionMessage(`Selected thumbnail "${item.name}".`);
    setVideoRequestError("");
  };

  const persistThumbnailForEditingVideo = async (thumbnailUrl: string) => {
    if (!editingUploadVideoId) return;
    const target = videoContent.videos.find((video) => video.id === editingUploadVideoId);
    if (!target) return;
    const nextContent: FashionVideoContent = {
      videos: videoContent.videos.map((video) => (video.id === editingUploadVideoId ? { ...video, thumbnail: thumbnailUrl } : video))
    };
    const saved = target.status === "published" ? await publishFashionVideoContent(nextContent) : await saveFashionVideoDraftContent(nextContent);
    setVideoContent(saved);
    setVideoActionMessage(
      target.status === "published"
        ? `Updated poster for "${target.title}" on the live page.`
        : `Updated poster for "${target.title}" in draft.`
    );
  };

  const handleVideoFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (uploadVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadVideoPreviewUrl);
    }
    if (uploadPreviewVideoRef.current) {
      uploadPreviewVideoRef.current.pause();
      uploadPreviewVideoRef.current.currentTime = 0;
    }
    const localPreviewUrl = URL.createObjectURL(file);
    setUploadVideoPreviewUrl(localPreviewUrl);
    setUploadSelectedVideoName(file.name);
    setIsUploadPreviewPlaying(false);
    setVideoRequestError("");
    setVideoActionMessage("");
    setUploadDuration("");
    setUploadVideoProgress(0);
    try {
      const browserMediaPromise = deriveVideoMediaInBrowser(file);
      setVideoActionMessage(`Uploading "${file.name}"...`);
      const response = await uploadFashionVideoAssetWithProgress(file, setUploadVideoProgress);
      applyUploadedVideoAsset(response.item);
      if (localPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      setUploadVideoPreviewUrl(response.item.url);
      setUploadSelectedVideoName(response.item.name);
      const browserMedia = await browserMediaPromise;
      if (response.duration) {
        setUploadDuration(response.duration);
      } else if (browserMedia.duration) {
        setUploadDuration(browserMedia.duration);
      }
      if (!uploadThumbnail && response.thumbnailItem) {
        setUploadThumbnailProgress(100);
        const thumbnailItem = response.thumbnailItem;
        applyUploadedThumbnailAsset(thumbnailItem);
        await persistThumbnailForEditingVideo(thumbnailItem.url);
        setVideoActionMessage(
          response.warning
            ? `Video uploaded. Duration detected automatically. ${response.warning}`
              : `Video and thumbnail prepared from "${file.name}".`
        );
      } else if (!uploadThumbnail && browserMedia.thumbnailFile) {
        setVideoActionMessage(`Uploading generated thumbnail for "${file.name}"...`);
        setUploadThumbnailProgress(0);
        const thumbnailItem = await uploadFashionVideoThumbnailWithProgress(browserMedia.thumbnailFile, setUploadThumbnailProgress);
        applyUploadedThumbnailAsset(thumbnailItem);
        await persistThumbnailForEditingVideo(thumbnailItem.url);
        setVideoActionMessage(
          response.duration || browserMedia.duration
            ? `Video and thumbnail prepared from "${file.name}".`
            : `Video uploaded. Thumbnail generated automatically. Duration may need manual input.`
        );
      } else {
        if (response.duration) {
          setVideoActionMessage(
            response.warning
              ? `Selected video asset "${response.item.name}". Duration detected automatically. ${response.warning}`
              : `Selected video asset "${response.item.name}". Duration detected automatically.`
          );
        } else {
          setVideoActionMessage(
            response.warning
              ? `Selected video asset "${response.item.name}". ${response.warning} Duration may need manual input.`
              : `Selected video asset "${response.item.name}". Duration may need manual input for this file type.`
          );
        }
      }
    } catch (error) {
      setUploadVideoProgress(null);
      setUploadThumbnailProgress(null);
      setVideoRequestError(error instanceof Error ? error.message : "Failed to upload video asset.");
    }
  };

  const handleThumbnailFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setVideoRequestError("");
    setVideoActionMessage("");
    setUploadThumbnailProgress(0);
    try {
      const localPreviewUrl = await readFileAsDataUrl(file);
      setUploadThumbnailPreviewUrl(localPreviewUrl);
      setUploadSelectedThumbnailName(file.name);
      const item = await uploadFashionVideoThumbnailWithProgress(file, setUploadThumbnailProgress);
      applyUploadedThumbnailAsset(item);
      await persistThumbnailForEditingVideo(item.url);
    } catch (error) {
      setUploadThumbnailProgress(null);
      setVideoRequestError(error instanceof Error ? `Thumbnail upload failed: ${error.message}` : "Thumbnail upload failed.");
    }
  };

  const handleModerateComment = async (videoId: string, commentId: string, status: "visible" | "hidden" | "flagged") => {
    setIsModeratingComment(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      await moderateFashionVideoCommentAsync(videoId, commentId, status);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      setVideoActionMessage(`Comment moved to ${status}.`);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to moderate comment.");
    } finally {
      setIsModeratingComment(false);
    }
  };

  const handleTogglePromoteVideo = async (videoId: string) => {
    setIsLibraryMutating(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const target = videoContent.videos.find((video) => video.id === videoId);
      if (!target) {
        throw new Error("Video not found.");
      }
      const shouldPromote = !target.isPromoted;
      const content = await toggleFashionVideoPromoteAsync(videoId);
      setVideoContent(content);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      setVideoActionMessage(`${shouldPromote ? "Promoted" : "Removed promotion from"} "${target.title}".`);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to update video promotion.");
    } finally {
      setIsLibraryMutating(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setIsLibraryMutating(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const target = videoContent.videos.find((video) => video.id === videoId);
      if (!target) {
        throw new Error("Video not found.");
      }
      const content = await deleteFashionVideoAsync(videoId);
      setVideoContent(content);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      setVideoActionMessage(`Deleted "${target.title}"${target.status === "published" ? " and updated the live page" : ""}.`);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to delete video.");
    } finally {
      setIsLibraryMutating(false);
    }
  };

  const handleUpdatePlacement = async (
    videoId: string,
    placement: "landing" | "feed" | "series" | "promoted"
  ) => {
    setIsLibraryMutating(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const content = await updateFashionVideoPlacementAsync(videoId, placement);
      setVideoContent(content);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      const target = content.videos.find((video) => video.id === videoId);
      setVideoActionMessage(`Moved "${target?.title ?? "video"}" to ${placement}.`);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to update placement.");
    } finally {
      setIsLibraryMutating(false);
    }
  };

  const handleReorderVideo = async (videoId: string, direction: "up" | "down") => {
    setIsLibraryMutating(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const content = await reorderFashionVideoAsync(videoId, direction);
      setVideoContent(content);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      const target = content.videos.find((video) => video.id === videoId);
      setVideoActionMessage(`Moved "${target?.title ?? "video"}" ${direction}.`);
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to reorder video.");
    } finally {
      setIsLibraryMutating(false);
    }
  };

  const openLibraryDetails = (videoId: string) => {
    const target = videoContent.videos.find((video) => video.id === videoId);
    if (!target) return;
    setLibraryDetailsVideoId(target.id);
    setLibraryEditTitle(target.title);
    setLibraryEditDescription(target.description);
    setLibraryEditSeries(target.series);
    setLibraryEditPlacement(target.placement);
    setLibraryEditMappedProductId(target.mappedProductId);
    setLibraryEditCollection(target.collection);
    setLibraryEditCategory(target.category);
    setLibraryEditTone(target.tone);
    setLibraryEditCheckoutLabel(target.checkoutLabel);
    setLibraryEditSourceLabel(target.sourceLabel);
    setLibraryEditWhatsAppNumber(target.whatsappNumber);
  };

  const closeLibraryDetails = () => {
    setLibraryDetailsVideoId("");
  };

  const buildLibraryDetailsRecord = () => {
    if (!libraryDetailsVideo) return null;
    const mappedProduct = libraryDetailsMappedProduct;
    return {
      ...libraryDetailsVideo,
      title: libraryEditTitle.trim(),
      description: libraryEditDescription.trim(),
      series: libraryEditSeries.trim(),
      placement: libraryEditPlacement,
      mappedProductId: libraryEditMappedProductId,
      collection: libraryEditCollection.trim() || mappedProduct?.collection || "",
      category: libraryEditCategory.trim() || mappedProduct?.category || "",
      tone: libraryEditTone.trim() || mappedProduct?.tone || "",
      styleTags: mappedProduct?.styleTags?.length ? mappedProduct.styleTags : libraryDetailsVideo.styleTags,
      checkoutLabel: libraryEditCheckoutLabel.trim(),
      sourceLabel: libraryEditSourceLabel.trim(),
      whatsappNumber: libraryEditWhatsAppNumber.trim(),
      isPromoted: libraryEditPlacement === "promoted" || libraryDetailsVideo.isPromoted
    } satisfies FashionVideoRecord;
  };

  const handleSaveLibraryDetails = async (publish = false) => {
    const nextRecord = buildLibraryDetailsRecord();
    if (!nextRecord) return;
    const issues = validateFashionVideoRecordForAdmin(nextRecord, fallbackVideoWhatsAppNumber);
    if (issues.length) {
      setVideoRequestError(issues[0].message);
      return;
    }
    setIsLibraryMutating(true);
    setVideoRequestError("");
    setVideoActionMessage("");
    try {
      const nextContent: FashionVideoContent = {
        videos: videoContent.videos.map((video) => (video.id === nextRecord.id ? { ...nextRecord, status: publish ? "published" : video.status } : video))
      };
      const saved = publish ? await publishFashionVideoContent(nextContent) : await saveFashionVideoDraftContent(nextContent);
      setVideoContent(saved);
      setVideoEngagementSummary(await getFashionVideoEngagementAdminSummaryAsync());
      setVideoAnalyticsSummary(await getFashionVideoAnalyticsSummaryAsync());
      setVideoActionMessage(`${publish ? "Saved and published" : "Saved"} "${nextRecord.title}".`);
      closeLibraryDetails();
    } catch (error) {
      setVideoRequestError(error instanceof Error ? error.message : "Failed to save video details.");
    } finally {
      setIsLibraryMutating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe8] text-[#17120e] dark:bg-[#0f0d0b] dark:text-[#f8f2eb]" style={eventThemeVars}>
      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f5efe8]/92 backdrop-blur dark:border-white/10 dark:bg-[#0f0d0b]/92">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => openPath("/boss/fashion")}
            className="inline-flex items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <img src={logo} alt="AutoHub logo" className="h-11 w-11 rounded-xl object-cover" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a5e3e] dark:text-[#d5b18b]">Fashion Boss</p>
              <p className="text-sm font-semibold">Video Ads Admin</p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openPath("/fashion/videos")}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
            >
              Open live video page
            </button>
            <button
              type="button"
              onClick={() => openPath("/boss/fashion")}
              className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)]"
            >
              Back to fashion admin
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="self-start lg:sticky lg:top-[5.75rem]">
            <div className="rounded-[2rem] border border-black/8 bg-white p-4 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <p className="px-2 text-xs font-bold uppercase tracking-[0.22em] text-[#7a5e3e] dark:text-[#d5b18b]">Navigation</p>
              <div className="mt-4 space-y-5">
                {navSections.map((section) => (
                  <div key={section.title}>
                    <h2 className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#bba692]">{section.title}</h2>
                    <div className="mt-2 grid gap-1.5">
                      {section.links.map((link) => {
                        const isActive = "key" in link ? link.key === workspace : false;
                        return (
                          <button
                            key={link.label}
                            type="button"
                            onClick={() => openPath(link.href)}
                            className={`flex items-center justify-between rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition ${
                              isActive
                                ? "bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] text-white shadow-[0_14px_34px_-24px_rgba(37,99,235,0.8)]"
                                : "text-[#2f241c] hover:bg-[#f4ece1] dark:text-[#f8f2eb] dark:hover:bg-white/5"
                            }`}
                          >
                            <span>{link.label}</span>
                            <span className={`text-xs ${isActive ? "text-white/78" : "text-[#9b856f] dark:text-[#bfa892]"}`}>Open</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
          <section className="rounded-[2rem] border border-black/8 bg-white px-5 py-4 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Current workspace</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">{activeVideoLink}</h2>
              </div>
              {workspace === "library" ? (
                <button
                  type="button"
                  onClick={() => setIsLibrarySupportOpen(true)}
                  className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)]"
                >
                  Library support
                </button>
              ) : workspace === "uploads" ? (
                <button
                  type="button"
                  onClick={() => setIsUploadFlowStagesOpen(true)}
                  className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)]"
                >
                  Upload flow stages
                </button>
              ) : null}
            </div>
            {videoRequestError ? <div className="mt-3 rounded-[1rem] border border-rose-300/45 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">{videoRequestError}</div> : null}
            {videoActionMessage ? <div className="mt-3 rounded-[1rem] border border-emerald-300/45 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">{videoActionMessage}</div> : null}
            {isBootstrappingVideos ? <div className="mt-3 text-sm font-semibold text-[#7a5e3e] dark:text-[#d5b18b]">Loading fashion video admin data...</div> : null}
          </section>

          {workspace === "overview" ? (
          <section className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-[linear-gradient(145deg,#081321,#102c4a_50%,#1d4ed8)] p-6 text-white shadow-[0_26px_80px_-38px_rgba(10,24,58,0.58)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">Video analytics overview</p>
                  <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Fashion video performance, readiness, and promotion dashboard.</h1>
                  <p className="mt-4 text-sm leading-7 text-white/78">
                    This overview is the analytics surface for the Fashion video system: content volume, publish readiness, real engagement totals, and moderation signals from live video activity.
                  </p>
                </div>
                <div className="grid min-w-[16rem] gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.3rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/62">Total videos</div>
                    <div className="mt-2 text-3xl font-black">{videoAnalyticsSummary.totals.totalVideos}</div>
                    <div className="mt-1 text-xs text-white/68">Feed + landing + series records</div>
                  </div>
                  <div className="rounded-[1.3rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/62">Live comments</div>
                    <div className="mt-2 text-3xl font-black">{videoAnalyticsSummary.totals.comments}</div>
                    <div className="mt-1 text-xs text-white/68">Visible + moderated video discussion</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Published", value: videoAnalyticsSummary.totals.publishedVideos, detail: "Videos already marked live", accent: "from-sky-500 to-cyan-300" },
                { label: "Promoted", value: videoAnalyticsSummary.totals.promotedVideos, detail: "Videos marked for higher visibility", accent: "from-amber-500 to-yellow-300" },
                { label: "Product-mapped", value: videoAnalyticsSummary.totals.mappedVideos, detail: "Supports More items like this", accent: "from-emerald-500 to-lime-300" },
                { label: "Reactions", value: videoAnalyticsSummary.totals.likes + videoAnalyticsSummary.totals.dislikes, detail: "Combined like/dislike activity", accent: "from-fuchsia-500 to-pink-300" }
              ].map((item) => (
                <article key={item.label} className="rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-[0_18px_48px_-34px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${item.accent} px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white`}>
                    {item.label}
                  </div>
                  <div className="mt-4 text-3xl font-black tracking-[-0.03em]">{item.value}</div>
                  <p className="mt-2 text-sm leading-6 text-[#615549] dark:text-[#d5c8bc]">{item.detail}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Wave trends</p>
                    <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Views, engagement, and publishing rhythm</h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {[
                    { title: "Views trend", bars: videoAnalyticsSummary.trends.views, tint: "from-sky-500/45 to-cyan-300/80" },
                    { title: "Engagement rhythm", bars: videoAnalyticsSummary.trends.engagement, tint: "from-fuchsia-500/45 to-pink-300/80" }
                  ].map((chart) => (
                    <article key={chart.title} className="rounded-[1.5rem] border border-black/8 bg-[#f8f3ec] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                      <div className="text-sm font-black">{chart.title}</div>
                      <div className="mt-4 flex h-40 items-end gap-2 overflow-hidden rounded-[1.1rem] bg-[linear-gradient(180deg,rgba(29,78,216,0.06),rgba(29,78,216,0.01))] px-3 py-3 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.08),rgba(255,255,255,0.02))]">
                        {chart.bars.map((bar, index) => (
                          <div key={`${chart.title}-${index}`} className="flex min-w-0 flex-1 flex-col justify-end">
                            <div
                              className={`w-full rounded-t-[0.8rem] bg-gradient-to-t ${chart.tint}`}
                              style={{ height: `${bar}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-black/8 bg-[#f8f3ec] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black">Publishing pulse</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b7764] dark:text-[#d5b18b]">Last 8 cycles</div>
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-2">
                    {videoAnalyticsSummary.trends.publishPulse.map((bar, index) => (
                      <div key={index} className="flex-1">
                        <div className="h-full rounded-[1rem] bg-[linear-gradient(180deg,rgba(29,78,216,0.12),rgba(29,78,216,0.03))] p-1 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.16),rgba(255,255,255,0.03))]">
                          <div className="h-full w-full rounded-[0.8rem] bg-transparent" style={{ clipPath: `polygon(0 ${100 - bar}%, 18% ${72 - bar / 3}%, 38% ${84 - bar / 4}%, 56% ${58 - bar / 5}%, 74% ${66 - bar / 6}%, 100% ${40 - bar / 7}%, 100% 100%, 0 100%)`, background: "linear-gradient(180deg, rgba(56,189,248,0.72), rgba(29,78,216,0.22))" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <section className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Recommendations</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">What the system suggests next</h2>
                  <div className="mt-5 space-y-3">
                    {videoAnalyticsSummary.recommendations.map((item, index) => (
                      <div key={item} className="flex items-start gap-3 rounded-[1.2rem] border border-black/8 bg-[#fbf7f1] px-4 py-3 dark:border-white/10 dark:bg-[#1e1a17]">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] text-[11px] font-black text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold text-[#2f241c] dark:text-[#f8f2eb]">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Top video signals</p>
                  <div className="mt-4 overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-3 pr-2">
                      {videoAnalyticsSummary.topVideos.map((video, index) => (
                        <article key={video.videoId} className="w-[18rem] shrink-0 rounded-[1.25rem] border border-black/8 bg-[#f8f3ec] px-4 py-3 dark:border-white/10 dark:bg-[#1e1a17]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-sm font-black">{video.title}</div>
                              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8b7764] dark:text-[#d5b18b]">{video.productCollection}</div>
                            </div>
                            <span className="rounded-full bg-[#ece2d4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-black/8 dark:bg-white/10">
                              <div className="h-2 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)]" style={{ width: `${Math.max(16, Math.min(100, video.score))}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-[#6b5f53] dark:text-[#d5c8bc]">{video.views} views</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Quick actions</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Upload new video", action: () => openPath("/boss/fashion/videos/uploads") },
                      { label: "Review video library", action: () => openPath("/boss/fashion/videos/library") },
                      { label: "Open live page", action: () => openPath("/fashion/videos") },
                      { label: "Back to fashion admin", action: () => openPath("/boss/fashion") }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className="rounded-[1.2rem] border border-black/8 bg-[#f8f3ec] px-4 py-3 text-left text-sm font-black transition hover:bg-[#efe4d6] dark:border-white/10 dark:bg-[#1e1a17] dark:hover:bg-white/10"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          </section>
          ) : null}

          {workspace === "library" ? (
          <section className="grid gap-6">
            <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Video library</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Feed-ready assets and mappings</h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-black/10 bg-[#f8f3ec] px-4 py-2 text-sm font-semibold text-[#2f241c] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb]"
                >
                  UI only
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-black/8 dark:border-white/10">
                <div className="grid grid-cols-[minmax(0,1.1fr)_0.42fr_0.56fr_1.04fr] gap-3 border-b border-black/8 bg-[#f8f3ec] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b543f] dark:border-white/10 dark:bg-[#1e1a17] dark:text-[#d5b18b]">
                  <span>Video</span>
                  <span>Length</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                <div className="max-h-[34rem] overflow-y-scroll pr-1">
                  {mappedVideos.map((video, index) => (
                    <div key={video.id} className="grid grid-cols-[minmax(0,1.1fr)_0.42fr_0.56fr_1.04fr] gap-3 border-b border-black/6 px-4 py-4 last:border-b-0 dark:border-white/6">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-black leading-5">{video.title}</div>
                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-[#6b5f53] dark:text-[#d5c8bc]">{video.description}</div>
                      </div>
                      <div className="text-sm font-semibold text-[#4e4237] dark:text-[#f3e7d9]">{video.duration}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${index < 3 ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" : "bg-[#ece2d4] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]"}`}>
                            {video.badge}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                            video.status === "published"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          }`}>
                            {formatVideoStatusLabel(video.status)}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] leading-5 text-[#6b5f53] dark:text-[#d5c8bc]">
                          {video.productName}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
                        <button
                          type="button"
                          disabled={isLibraryMutating}
                          onClick={() => openLibraryDetails(video.id)}
                          className="min-w-0 rounded-full border border-black/10 bg-white px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#2f241c] transition hover:bg-[#f6f1ea] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                        >
                          Details
                        </button>
                        <select
                          value={video.placement}
                          disabled={isLibraryMutating}
                          onChange={(event) =>
                            void handleUpdatePlacement(
                              video.id,
                              event.target.value as "landing" | "feed" | "series" | "promoted"
                            )
                          }
                          className="min-w-0 rounded-full border border-black/10 bg-white px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#2f241c] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb]"
                          style={selectSurfaceStyle}
                        >
                          <option value="landing" style={selectSurfaceStyle}>Landing</option>
                          <option value="feed" style={selectSurfaceStyle}>Feed</option>
                          <option value="series" style={selectSurfaceStyle}>Series</option>
                          <option value="promoted" style={selectSurfaceStyle}>Promoted</option>
                        </select>
                        <button
                          type="button"
                          disabled={isLibraryMutating || index === 0}
                          onClick={() => void handleReorderVideo(video.id, "up")}
                          className="min-w-0 rounded-full border border-black/10 bg-white px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#2f241c] transition hover:bg-[#f6f1ea] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={isLibraryMutating || index === mappedVideos.length - 1}
                          onClick={() => void handleReorderVideo(video.id, "down")}
                          className="min-w-0 rounded-full border border-black/10 bg-white px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#2f241c] transition hover:bg-[#f6f1ea] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          disabled={isLibraryMutating}
                          onClick={() => void handleTogglePromoteVideo(video.id)}
                          className={`min-w-0 rounded-full border px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            video.isPromoted || video.placement === "promoted"
                              ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
                          }`}
                        >
                          {video.isPromoted || video.placement === "promoted" ? "Promoted" : "Promote"}
                        </button>
                        <button
                          type="button"
                          disabled={isLibraryMutating}
                          onClick={() => void handleDeleteVideo(video.id)}
                          className="min-w-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </section>
          ) : null}

          {workspace === "uploads" ? (
          <section className="grid gap-6">
            <section className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Uploads systems</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Video upload workspace before backend</h2>
                </div>
                <button
                  type="button"
                  onClick={() => openUploadEditor()}
                  className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)]"
                >
                  Upload video
                </button>
              </div>
              <div className="mt-5 rounded-[1.6rem] border border-dashed border-black/12 bg-[#faf6ef] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b7764] dark:text-[#d5b18b]">Saved uploads</p>
                    <h3 className="mt-2 text-lg font-black">Uploaded videos queue</h3>
                  </div>
                  <span className="rounded-full bg-[#ece2d4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]">
                    {videoContent.videos.length} items
                  </span>
                </div>

                {videoContent.videos.length ? (
                  <div className="mt-4 grid max-h-[34rem] gap-3 overflow-y-scroll pr-1">
                    {videoContent.videos.map((video) => (
                      <article key={video.id} className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#171513]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-[#1f1812] dark:text-[#f8f2eb]">{video.title}</h4>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${video.status === "published" ? "bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] text-white" : "bg-[#ece2d4] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]"}`}>
                                {formatVideoStatusLabel(video.status)}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">{video.description}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-[#7a5e3e] dark:text-[#d5b18b]">{video.duration}</span>
                            <button
                              type="button"
                              onClick={() => openUploadEditor(video)}
                              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#2f241c] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePublishUploadedVideo(video.id)}
                              disabled={video.status === "published" || isPublishingVideoDraft || Boolean(issuesByVideoId[video.id]?.length)}
                              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                                video.status === "published"
                                  ? "cursor-default bg-[#d7f7e1] text-[#166534] dark:bg-[#11331f] dark:text-[#8ef0b0]"
                                  : Boolean(issuesByVideoId[video.id]?.length)
                                  ? "cursor-not-allowed bg-[#ddd6ce] text-[#8b7764] dark:bg-white/10 dark:text-[#ad9887]"
                                  : "bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] text-white shadow-[0_16px_36px_-24px_rgba(37,99,235,0.75)]"
                              }`}
                            >
                              {video.status === "published" ? "Published" : isPublishingVideoDraft ? "Publishing..." : "Publish"}
                            </button>
                          </div>
                        </div>
                        {issuesByVideoId[video.id]?.length ? (
                          <div className="mt-3 rounded-[1rem] border border-amber-300/45 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                            {issuesByVideoId[video.id][0].message}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid min-h-[15rem] place-items-center rounded-[1.25rem] border border-black/8 bg-white/80 text-center dark:border-white/10 dark:bg-[#171513]">
                    <div className="max-w-sm px-6">
                      <div className="text-sm font-black">Blank uploads box</div>
                      <div className="mt-2 text-xs leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">
                        Saved videos will appear here as drafts first, then change to published after the publish button is clicked.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

          </section>
          ) : null}

          {workspace === "commerce" ? (
          <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Commerce + engagement</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Live CTA and moderation controls</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <article className="rounded-[1.5rem] border border-black/8 bg-[#f8f3ec] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b7764] dark:text-[#d5b18b]">CTA pair</div>
                  <h3 className="mt-2 text-base font-black">Check out + More items like this</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">Video watch view is now mapped to real checkout labels, WhatsApp routing, and product suggestions from saved video records.</p>
                </article>
                <article className="rounded-[1.5rem] border border-black/8 bg-[#f8f3ec] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b7764] dark:text-[#d5b18b]">Engagement totals</div>
                  <h3 className="mt-2 text-base font-black">{videoEngagementSummary.totals.views} views · {videoEngagementSummary.totals.comments} comments</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">This workspace now reads real public video engagement from the backend store instead of static placeholder counts.</p>
                </article>
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Comment moderation</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Review and control viewer comments</h2>
                </div>
                <span className="rounded-full bg-[#ece2d4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]">
                  {videoEngagementSummary.totals.comments} comments
                </span>
              </div>
              <div className="mt-5 space-y-3 max-h-[36rem] overflow-y-auto pr-1">
                {mappedVideos.flatMap((video) =>
                  (video.engagement?.comments ?? []).map((comment) => (
                    <article key={`${video.id}-${comment.id}`} className="rounded-[1.25rem] border border-black/8 bg-[#f8f3ec] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black">{comment.name}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8b7764] dark:text-[#d5b18b]">
                            {video.title} · {comment.status ?? "visible"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["visible", "flagged", "hidden"] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={isModeratingComment || comment.status === status}
                              onClick={() => void handleModerateComment(video.id, comment.id, status)}
                              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                                comment.status === status
                                  ? "bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] text-white"
                                  : "border border-black/10 bg-white text-[#2f241c] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb]"
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">{comment.text}</p>
                    </article>
                  ))
                )}
                {!mappedVideos.some((video) => (video.engagement?.comments.length ?? 0) > 0) ? (
                  <div className="rounded-[1.25rem] border border-black/8 bg-[#f8f3ec] p-4 text-sm font-semibold text-[#6b5f53] dark:border-white/10 dark:bg-[#1e1a17] dark:text-[#d5c8bc]">
                    No public comments have been submitted yet.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
          ) : null}

          {workspace === "previews" ? (
          <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Preview surfaces</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Desktop and mini-player visual direction</h2>
              <p className="mt-3 text-sm leading-7 text-[#6b5f53] dark:text-[#d5c8bc]">
                This workspace isolates how the live watch page should feel visually across the full player and PiP mini-player before media backend wiring starts.
              </p>
            </div>

            <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(58,36,18,0.18)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Preview surfaces</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Desktop and mini-player visual direction</h2>
                </div>
                <span className="rounded-full bg-[#ece2d4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]">
                  UI-only
                </span>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.7rem] border border-black/8 bg-[#13100d] p-4 dark:border-white/10">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)]">
                    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.76)_60%,rgba(0,0,0,0.95)_100%)] px-4 pb-4 pt-10">
                      <div className="mb-3 h-1.5 rounded-full bg-white/20">
                        <div className="h-1.5 w-[38%] rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)]" />
                      </div>
                      <div className="flex items-center gap-3 text-white">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171513]">▶</span>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25">🔊</span>
                        <span className="text-xs font-semibold text-white/85">00:08 / 00:24</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-white/78">Desktop watch preview with hover controls, timing, and product actions.</div>
                </div>

                <div className="flex items-end justify-center rounded-[1.7rem] border border-black/8 bg-[#f8f3ec] p-5 dark:border-white/10 dark:bg-[#1e1a17]">
                  <div className="relative h-[13rem] w-[18rem] overflow-hidden rounded-[1.1rem] border border-black/15 bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)] shadow-[0_28px_80px_-30px_rgba(0,0,0,0.55)] dark:border-white/10">
                    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                    <button type="button" className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-sm text-white">
                      ×
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.76)_60%,rgba(0,0,0,0.95)_100%)] px-3 pb-3 pt-8">
                      <div className="mb-2 h-1 rounded-full bg-white/20">
                        <div className="h-1 w-[42%] rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)]" />
                      </div>
                      <div className="flex items-center gap-2 text-white">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#171513]">▶</span>
                        <span className="min-w-[4.5rem] text-[10px] font-semibold">00:08 / 00:24</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-[11px]">🔊</span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-[11px]">↩</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          ) : null}
          </div>
        </div>
      </main>

      {isUploadOverlayOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 px-4 py-3 backdrop-blur-sm sm:px-5">
          <div className="grid min-h-full place-items-center">
            <div className="flex max-h-[92vh] w-full max-w-[70rem] flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-[rgba(248,243,236,0.94)] p-4 shadow-[0_36px_100px_-40px_rgba(15,10,6,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(23,21,19,0.94)]">
              <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,.mov" className="hidden" onChange={handleVideoFileSelection} />
              <input ref={thumbnailFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif" className="hidden" onChange={handleThumbnailFileSelection} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">{editingUploadVideoId ? "Edit video" : "Upload video"}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">{editingUploadVideoId ? "Edit uploaded video draft" : "Video upload setup workspace"}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOverlayOpen(false);
                    resetUploadForm();
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-[#2f241c] transition hover:bg-white dark:border-white/10 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                  aria-label="Close upload overlay"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 h-[calc(92vh-11rem)] min-h-0 overflow-hidden">
              <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.18fr)_17.5rem]">
                <div className="min-h-0 rounded-[1.2rem] border border-black/10 bg-white/55 dark:border-white/10 dark:bg-white/5">
                  <div className="h-full overflow-y-scroll px-3.5 py-3.5 [scrollbar-width:thin]">
                    <div className="space-y-4">
                    <section>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Video details</p>
                      <div className="mt-2.5 grid gap-2.5">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Video title</span>
                          <input type="text" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Title for the uploaded video" className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Description</span>
                          <textarea rows={3} value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} placeholder="Description for the uploaded video. This field can hold longer content safely." className="resize-y rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                        </label>
                        <div className="grid gap-2.5 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Duration</span>
                            <input type="text" value={uploadDuration} onChange={(event) => setUploadDuration(event.target.value)} placeholder="00:24" className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Series / grouping</span>
                            <input type="text" value={uploadSeries} onChange={(event) => setUploadSeries(event.target.value)} placeholder="Series or campaign group" className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                          </label>
                        </div>
                        <div className="grid gap-2.5 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Placement</span>
                            <select value={uploadPlacement} onChange={(event) => setUploadPlacement(event.target.value as FashionVideoPlacement)} className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb]" style={selectSurfaceStyle}>
                              <option value="landing" style={selectSurfaceStyle}>Landing</option>
                              <option value="feed" style={selectSurfaceStyle}>Feed</option>
                              <option value="series" style={selectSurfaceStyle}>Series</option>
                              <option value="promoted" style={selectSurfaceStyle}>Promoted slot</option>
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Status badge</span>
                            <select className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb]" style={selectSurfaceStyle}>
                              <option style={selectSurfaceStyle}>Draft</option>
                              <option style={selectSurfaceStyle}>Ready</option>
                              <option style={selectSurfaceStyle}>Promoted</option>
                              <option style={selectSurfaceStyle}>Queued</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </section>

                    <section>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Fashion mapping</p>
                      <div className="mt-2.5 grid gap-2.5">
                        <div className="grid gap-2.5 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Collection</span>
                            <select value={uploadCollection} onChange={(event) => setUploadCollection(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb]" style={selectSurfaceStyle}>
                              {collectionOptions.map((option) => <option key={option} style={selectSurfaceStyle}>{option}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Category</span>
                            <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb]" style={selectSurfaceStyle}>
                              {categoryOptions.map((option) => <option key={option} style={selectSurfaceStyle}>{option}</option>)}
                            </select>
                          </label>
                        </div>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Tone</span>
                          <select value={uploadTone} onChange={(event) => setUploadTone(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb]" style={selectSurfaceStyle}>
                            {toneOptions.map((option) => <option key={option} style={selectSurfaceStyle}>{option}</option>)}
                          </select>
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Mapped product</span>
                          <select value={uploadMappedProductId} onChange={(event) => setUploadMappedProductId(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb]" style={selectSurfaceStyle}>
                            {allProducts.map((product) => <option key={product.id} value={product.id} style={selectSurfaceStyle}>{product.name}</option>)}
                          </select>
                        </label>
                        <div className="grid gap-2">
                          <span className="text-sm font-semibold">Style tags</span>
                          <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-black/10 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-[#171513]">
                            {(selectedMappedProduct?.styleTags?.length ? selectedMappedProduct.styleTags : styleTagOptions).map((tag) => <span key={tag} className="rounded-full bg-[#ece2d4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]">{tag}</span>)}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Checkout / WhatsApp</p>
                      <div className="mt-2.5 grid gap-2.5">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">WhatsApp number placeholder</span>
                          <input type="text" value={uploadWhatsAppNumber} onChange={(event) => setUploadWhatsAppNumber(event.target.value)} placeholder="+250..." className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                        </label>
                        <div className="grid gap-2.5 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Check out label</span>
                            <input type="text" value={uploadCheckoutLabel} onChange={(event) => setUploadCheckoutLabel(event.target.value)} placeholder="Check out" className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold">Source label</span>
                            <input type="text" value={uploadSourceLabel} onChange={(event) => setUploadSourceLabel(event.target.value)} placeholder="Fashion videos upload" className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1f1812] outline-none placeholder:text-[#8d7764] dark:border-white/10 dark:bg-[#171513] dark:text-[#f8f2eb] dark:placeholder:text-[#9d8a7a]" />
                          </label>
                        </div>
                      </div>
                    </section>
                    </div>
                  </div>
                </div>

                <aside className="min-h-0 overflow-y-scroll pr-1 [scrollbar-width:thin]">
                  <div className="space-y-3">
                  <section className="rounded-[1.2rem] border border-black/10 bg-white/55 px-3.5 py-3.5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Video preview</p>
                        <h3 className="mt-1.5 text-lg font-black tracking-[-0.03em]">Uploading video mockup</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => videoFileInputRef.current?.click()}
                        className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_16px_36px_-24px_rgba(37,99,235,0.75)]"
                      >
                        Select video
                      </button>
                    </div>

                    <div className="mt-3 rounded-[1.1rem] border border-black/10 bg-[#13100d] p-2.5 dark:border-white/10">
                      <div className="relative aspect-[16/8.8] overflow-hidden rounded-[1rem] bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)]">
                        {uploadVideoPreviewUrl ? (
                          <video
                            ref={uploadPreviewVideoRef}
                            key={uploadVideoPreviewUrl}
                            src={uploadVideoPreviewUrl}
                            data-remote-src={uploadVideoRemotePreviewUrl || undefined}
                            className="absolute inset-0 h-full w-full object-cover"
                            controls
                            muted
                            playsInline
                            onLoadedMetadata={(event) => {
                              const seconds = event.currentTarget.duration;
                              if (!Number.isFinite(seconds) || seconds <= 0) return;
                              setUploadDuration((current) => (current.trim() ? current : formatVideoDuration(seconds)));
                            }}
                            onPlay={() => setIsUploadPreviewPlaying(true)}
                            onPause={() => setIsUploadPreviewPlaying(false)}
                            onEnded={() => setIsUploadPreviewPlaying(false)}
                          />
                        ) : (
                          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                        )}
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                          {typeof uploadVideoProgress === "number" ? `${uploadVideoProgress}%` : "Idle"}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.78)_58%,rgba(0,0,0,0.96)_100%)] px-2.5 pb-2.5 pt-8">
                          <div className="mb-2 h-1.5 rounded-full bg-white/20">
                            <div
                              className="h-1.5 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_48%,#38bdf8)]"
                              style={{ width: `${Math.max(0, Math.min(uploadVideoProgress ?? 0, 100))}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-white">
                            <button
                              type="button"
                              onClick={() => void toggleUploadPreviewPlayback()}
                              disabled={!uploadVideoPreviewUrl}
                              aria-label={isUploadPreviewPlaying ? "Pause uploaded video preview" : "Play uploaded video preview"}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#171513] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUploadPreviewPlaying ? "❚❚" : "▶"}
                            </button>
                            <span className="text-xs font-semibold text-white/85">{uploadSelectedVideoName || "No video selected yet"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.2rem] border border-dashed border-black/12 bg-white/55 px-3.5 py-3.5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Video thumbnail</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${uploadThumbnailPreviewUrl ? "bg-[#d7f7e1] text-[#166534] dark:bg-[#11331f] dark:text-[#8ef0b0]" : "bg-[#ece2d4] text-[#6b543f] dark:bg-white/10 dark:text-[#d5b18b]"}`}>
                        {uploadThumbnailPreviewUrl ? "Ready" : "No thumbnail"}
                      </span>
                    </div>
                    <div className="mt-2.5 overflow-hidden rounded-[1rem] border border-black/8 bg-[#faf6ef] dark:border-white/10 dark:bg-[#1e1a17]">
                      {uploadThumbnailPreviewUrl ? (
                        <div>
                          <div className="relative aspect-[16/8.6] overflow-hidden bg-[#13100d]">
                            <img
                              src={uploadThumbnailPreviewUrl}
                              alt={uploadSelectedThumbnailName || "Selected thumbnail"}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.76)_60%,rgba(0,0,0,0.95)_100%)] px-3 pb-3 pt-7 text-white">
                              <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                                {typeof uploadThumbnailProgress === "number" ? `${uploadThumbnailProgress}% uploaded` : uploadThumbnail?.tone ?? "Selected thumbnail"}
                              </div>
                              <div className="mt-1 text-sm font-black">Thumbnail preview</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black">{uploadSelectedThumbnailName || uploadThumbnail?.name || "Selected thumbnail"}</div>
                              <div className="text-[11px] leading-5 text-[#6b5f53] dark:text-[#d5c8bc]">Poster image ready for feed and watch preview.</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => thumbnailFileInputRef.current?.click()}
                                className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadThumbnail(null);
                                  setUploadThumbnailPreviewUrl("");
                                  setUploadSelectedThumbnailName("");
                                  setUploadThumbnailProgress(null);
                                }}
                                className="rounded-full border border-[#c56d6d]/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a73737] transition hover:bg-[#fff1f1] dark:border-[#e08383]/25 dark:text-[#f0a2a2] dark:hover:bg-[#2a1717]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid min-h-[7.5rem] place-items-center px-4 py-4 text-center">
                          <div>
                            <div className="text-sm font-black">Thumbnail placeholder box</div>
                            <div className="mt-2 text-xs leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">Reserved for the poster or thumbnail that will represent the uploaded video.</div>
                            <button
                              type="button"
                              onClick={() => thumbnailFileInputRef.current?.click()}
                              className="mt-3 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_16px_36px_-24px_rgba(37,99,235,0.75)]"
                            >
                              Upload thumbnail
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                  </div>
                </aside>
              </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-3 border-t border-black/8 bg-[rgba(248,243,236,0.96)] pt-3 dark:border-white/10 dark:bg-[rgba(23,21,19,0.96)]">
                {uploadDraftPreviewIssues.length ? (
                  <div className="mr-auto rounded-[0.9rem] border border-amber-300/45 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                    {uploadDraftPreviewIssues[0]}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsUploadOverlayOpen(false)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveUploadDraft(true)}
                  disabled={
                    isSavingVideoDraft ||
                    isPublishingVideoDraft ||
                    isBootstrappingVideos ||
                    !selectedMappedProduct ||
                    uploadDraftPreviewIssues.length > 0
                  }
                  className="rounded-full border border-[#1d4ed8]/20 bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16213a] disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-400/20 dark:bg-[#0b1324] dark:hover:bg-[#12203a]"
                >
                  {isSavingVideoDraft ? "Publishing..." : editingUploadVideoId ? "Update & publish live" : "Publish live"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveUploadDraft(false)}
                  disabled={
                    isSavingVideoDraft ||
                    isPublishingVideoDraft ||
                    isBootstrappingVideos ||
                    !selectedMappedProduct ||
                    uploadDraftPreviewIssues.length > 0
                  }
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
                >
                  {isSavingVideoDraft ? "Saving..." : editingUploadVideoId ? "Save draft changes" : "Save draft only"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isUploadFlowStagesOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="grid min-h-full place-items-center">
            <div className="w-full max-w-2xl rounded-[2rem] border border-black/10 bg-[#f8f3ec] p-5 shadow-[0_40px_120px_-44px_rgba(0,0,0,0.55)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Upload flow stages</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Validation and publishing flow</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadFlowStagesOpen(false)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 rounded-[1.2rem] border border-black/8 bg-[#f8f3ec] p-4 dark:border-white/10 dark:bg-[#1e1a17]">
                <div className="text-sm font-black">Validation checks</div>
                <div className="mt-2 text-xs leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">
                  Save and publish are blocked when required video fields are missing.
                </div>
                <div className="mt-3 space-y-2">
                  {(videoValidationIssues.length
                    ? videoValidationIssues.slice(0, 4)
                    : [{ videoId: "ok", title: "All videos", field: "ok", message: "No blocking validation issues right now." }]).map((issue) => (
                    <div
                      key={`${issue.videoId}-${issue.field}-${issue.message}`}
                      className={`rounded-[0.9rem] px-3 py-2 text-xs font-semibold ${
                        issue.videoId === "ok"
                          ? "border border-emerald-300/45 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "border border-amber-300/45 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
                      }`}
                    >
                      {issue.videoId === "ok" ? issue.message : `${issue.title}: ${issue.message}`}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {["Choose source", "Upload asset", "Attach thumbnail", "Set metadata", "Preview in player", "Queue for publish"].map((stage, index) => (
                  <div key={stage} className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-[#fbf7f1] px-4 py-3 dark:border-white/10 dark:bg-[#1e1a17]">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#17120f] text-xs font-black text-white dark:bg-white dark:text-[#171513]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {libraryDetailsVideo ? (
        <div className="fixed inset-0 z-50 bg-black/55 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="grid min-h-full place-items-center">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-black/10 bg-[#f8f3ec] shadow-[0_40px_120px_-44px_rgba(0,0,0,0.55)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex items-center justify-between gap-4 border-b border-black/8 px-5 py-4 dark:border-white/10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Video details</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">{libraryDetailsVideo.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeLibraryDetails}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="min-h-0 overflow-y-auto border-b border-black/8 px-5 py-5 dark:border-white/10 lg:border-b-0 lg:border-r">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Video title</span>
                      <input
                        value={libraryEditTitle}
                        onChange={(event) => setLibraryEditTitle(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2 sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Description</span>
                      <textarea
                        value={libraryEditDescription}
                        onChange={(event) => setLibraryEditDescription(event.target.value)}
                        rows={5}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Series</span>
                      <input
                        value={libraryEditSeries}
                        onChange={(event) => setLibraryEditSeries(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Placement</span>
                      <select
                        value={libraryEditPlacement}
                        onChange={(event) => setLibraryEditPlacement(event.target.value as FashionVideoPlacement)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                        style={selectSurfaceStyle}
                      >
                        <option value="landing" style={selectSurfaceStyle}>Landing</option>
                        <option value="feed" style={selectSurfaceStyle}>Feed</option>
                        <option value="series" style={selectSurfaceStyle}>Series</option>
                        <option value="promoted" style={selectSurfaceStyle}>Promoted</option>
                      </select>
                    </label>
                    <label className="grid gap-2 sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Mapped product</span>
                      <select
                        value={libraryEditMappedProductId}
                        onChange={(event) => setLibraryEditMappedProductId(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                        style={selectSurfaceStyle}
                      >
                        {allProducts.map((product) => (
                          <option key={product.id} value={product.id} style={selectSurfaceStyle}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Collection</span>
                      <input
                        value={libraryEditCollection}
                        onChange={(event) => setLibraryEditCollection(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Category</span>
                      <input
                        value={libraryEditCategory}
                        onChange={(event) => setLibraryEditCategory(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Tone</span>
                      <input
                        value={libraryEditTone}
                        onChange={(event) => setLibraryEditTone(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Check out label</span>
                      <input
                        value={libraryEditCheckoutLabel}
                        onChange={(event) => setLibraryEditCheckoutLabel(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Source label</span>
                      <input
                        value={libraryEditSourceLabel}
                        onChange={(event) => setLibraryEditSourceLabel(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                    <label className="grid gap-2 sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">WhatsApp number</span>
                      <input
                        value={libraryEditWhatsAppNumber}
                        onChange={(event) => setLibraryEditWhatsAppNumber(event.target.value)}
                        className="rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                  </div>
                </div>

                <aside className="min-h-0 overflow-y-auto px-5 py-5">
                  <div className="space-y-4">
                    <section className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Current mapping</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div><span className="font-black">Product:</span> {libraryDetailsMappedProduct?.name ?? "No mapped product"}</div>
                        <div><span className="font-black">Collection:</span> {libraryEditCollection || libraryDetailsMappedProduct?.collection || "-"}</div>
                        <div><span className="font-black">Category:</span> {libraryEditCategory || libraryDetailsMappedProduct?.category || "-"}</div>
                        <div><span className="font-black">Tone:</span> {libraryEditTone || libraryDetailsMappedProduct?.tone || "-"}</div>
                      </div>
                    </section>
                    <section className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Engagement</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className="rounded-full bg-[#ece2d4] px-3 py-1 dark:bg-white/10">{libraryDetailsVideo.engagement?.views ?? 0} views</span>
                        <span className="rounded-full bg-[#ece2d4] px-3 py-1 dark:bg-white/10">👍 {libraryDetailsVideo.engagement?.likes ?? libraryDetailsVideo.likes}</span>
                        <span className="rounded-full bg-[#ece2d4] px-3 py-1 dark:bg-white/10">👎 {libraryDetailsVideo.engagement?.dislikes ?? libraryDetailsVideo.dislikes}</span>
                        <span className="rounded-full bg-[#ece2d4] px-3 py-1 dark:bg-white/10">{libraryDetailsVideo.engagement?.commentCount ?? libraryDetailsVideo.comments.length} comments</span>
                      </div>
                    </section>
                    <section className="rounded-[1.4rem] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7764] dark:text-[#d5b18b]">Notes</p>
                      <p className="mt-3 text-sm leading-6 text-[#6b5f53] dark:text-[#d5c8bc]">
                        This overlay is the direct edit surface for secondary video metadata, so the library rows stay compact and easier to scan.
                      </p>
                    </section>
                  </div>
                </aside>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-black/8 px-5 py-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={closeLibraryDetails}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isLibraryMutating}
                  onClick={() => void handleSaveLibraryDetails(false)}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[#f6f1ea] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={isLibraryMutating}
                  onClick={() => void handleSaveLibraryDetails(true)}
                  className="rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save & publish
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isLibrarySupportOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="grid min-h-full place-items-center">
            <div className="w-full max-w-2xl rounded-[2rem] border border-black/10 bg-[#f8f3ec] p-5 shadow-[0_40px_120px_-44px_rgba(0,0,0,0.55)] dark:border-white/10 dark:bg-[#171513]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5e3e] dark:text-[#d5b18b]">Library support</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Placement and publishing stages</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLibrarySupportOpen(false)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-white dark:border-white/10 dark:hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {publishStages.map((stage, index) => (
                  <div key={stage} className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-[#fbf7f1] px-4 py-3 dark:border-white/10 dark:bg-[#1e1a17]">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#17120f] text-xs font-black text-white dark:bg-white dark:text-[#171513]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FashionVideoBoss;
