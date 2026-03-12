import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  buildFashionClientViewModel,
  getFashionClientViewModelState,
  getPublishedFashionContentStateAsync,
  type FashionPublishedSource
} from "../utils/fashionDraft";
import { getFashionMetaAsync } from "../utils/fashionAdminStorage";

type FashionViewModel = ReturnType<typeof getFashionClientViewModelState>["viewModel"];

type UseFashionPublishedSyncOptions = {
  pollIntervalMs?: number;
  strictBackendOnly?: boolean;
};

const DEFAULT_POLL_INTERVAL_MS = 10_000;

export const useFashionPublishedSync = (
  setFashionViewModel: Dispatch<SetStateAction<FashionViewModel>>,
  setSource?: Dispatch<SetStateAction<FashionPublishedSource>>,
  options?: UseFashionPublishedSyncOptions
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
    const strictBackendOnly = options?.strictBackendOnly === true;

    const syncFromCache = () => {
      if (!active) return;
      const state = getFashionClientViewModelState();
      setFashionViewModel(state.viewModel);
      setSource?.(state.source);
    };

    const syncFromServer = async () => {
      try {
        const state = await getPublishedFashionContentStateAsync();
        if (!active) return;
        setFashionViewModel(buildFashionClientViewModel(state.content));
        setSource?.(state.source);
        const meta = await getFashionMetaAsync();
        if (!active) return;
        if (meta?.publishedRevision) {
          lastPublishedRevisionRef.current = meta.publishedRevision;
        }
      } catch {
        if (!active) return;
        if (strictBackendOnly) {
          setSource?.("unavailable");
        }
      }
    };

    const syncFromRevision = async () => {
      try {
        const meta = await getFashionMetaAsync();
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
        if (strictBackendOnly) {
          setSource?.("unavailable");
        }
      }
    };

    const syncFromVisibility = () => {
      if (!active || document.visibilityState !== "visible") return;
      void syncFromRevision();
    };

    void syncFromServer();
    if (!strictBackendOnly) {
      window.addEventListener("fashion:published-cache-updated", syncFromCache);
      window.addEventListener("storage", syncFromCache);
    }
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
      if (!strictBackendOnly) {
        window.removeEventListener("fashion:published-cache-updated", syncFromCache);
        window.removeEventListener("storage", syncFromCache);
      }
      window.removeEventListener("focus", syncFromVisibility);
      document.removeEventListener("visibilitychange", syncFromVisibility);
      if (pollHandle !== null) {
        window.clearInterval(pollHandle);
      }
    };
  }, [options?.pollIntervalMs, options?.strictBackendOnly, setFashionViewModel, setSource]);
};
