import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { fetchPublishedFashionVideosAsync, getFashionVideoMetaAsync, type FashionVideoPageRecord } from "../utils/fashionVideoContent";

type UseFashionVideoPublishedSyncOptions = {
  pollIntervalMs?: number;
  onUnavailable?: () => void;
  onLoaded?: (videos: FashionVideoPageRecord[]) => void;
};

const DEFAULT_POLL_INTERVAL_MS = 10_000;

export const useFashionVideoPublishedSync = (
  setVideoRecords: Dispatch<SetStateAction<FashionVideoPageRecord[]>>,
  options?: UseFashionVideoPublishedSyncOptions
) => {
  const lastPublishedRevisionRef = useRef("");

  useEffect(() => {
    let active = true;
    const pollIntervalMs =
      typeof options?.pollIntervalMs === "number" && options.pollIntervalMs > 0
        ? Math.floor(options.pollIntervalMs)
        : options?.pollIntervalMs === 0
          ? 0
          : DEFAULT_POLL_INTERVAL_MS;

    const syncFromServer = async () => {
      try {
        const nextVideos = await fetchPublishedFashionVideosAsync();
        if (!active) return;
        setVideoRecords(nextVideos);
        options?.onLoaded?.(nextVideos);
        const meta = await getFashionVideoMetaAsync();
        if (!active) return;
        if (meta?.publishedRevision) {
          lastPublishedRevisionRef.current = meta.publishedRevision;
        }
      } catch {
        if (!active) return;
        options?.onUnavailable?.();
      }
    };

    const syncFromRevision = async () => {
      try {
        const meta = await getFashionVideoMetaAsync();
        if (!active || !meta?.publishedRevision) return;
        if (!lastPublishedRevisionRef.current) {
          lastPublishedRevisionRef.current = meta.publishedRevision;
          return;
        }
        if (lastPublishedRevisionRef.current !== meta.publishedRevision) {
          await syncFromServer();
        }
      } catch {
        if (!active) return;
        options?.onUnavailable?.();
      }
    };

    const syncFromVisibility = () => {
      if (!active || document.visibilityState !== "visible") return;
      void syncFromRevision();
    };

    void syncFromServer();
    window.addEventListener("focus", syncFromVisibility);
    document.addEventListener("visibilitychange", syncFromVisibility);

    const pollHandle =
      pollIntervalMs > 0
        ? window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            void syncFromRevision();
          }, pollIntervalMs)
        : null;

    return () => {
      active = false;
      window.removeEventListener("focus", syncFromVisibility);
      document.removeEventListener("visibilitychange", syncFromVisibility);
      if (pollHandle !== null) {
        window.clearInterval(pollHandle);
      }
    };
  }, [options?.onLoaded, options?.onUnavailable, options?.pollIntervalMs, setVideoRecords]);
};
