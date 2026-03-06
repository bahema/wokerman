import { useEffect, type Dispatch, type SetStateAction } from "react";
import { buildFashionClientViewModel, getFashionClientViewModel, getPublishedFashionContentAsync } from "../utils/fashionDraft";

type FashionViewModel = ReturnType<typeof getFashionClientViewModel>;

type UseFashionPublishedSyncOptions = {
  pollIntervalMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 45_000;

export const useFashionPublishedSync = (
  setFashionViewModel: Dispatch<SetStateAction<FashionViewModel>>,
  options?: UseFashionPublishedSyncOptions
) => {
  useEffect(() => {
    let active = true;
    const pollIntervalMs =
      typeof options?.pollIntervalMs === "number" && options.pollIntervalMs > 0
        ? Math.floor(options.pollIntervalMs)
        : options?.pollIntervalMs === 0
          ? 0
          : DEFAULT_POLL_INTERVAL_MS;

    const syncFromCache = () => {
      if (!active) return;
      setFashionViewModel(getFashionClientViewModel());
    };

    const syncFromServer = async () => {
      try {
        const content = await getPublishedFashionContentAsync();
        if (!active) return;
        setFashionViewModel(buildFashionClientViewModel(content));
      } catch {
        // Keep rendering from last known cache on request failures.
      }
    };

    void syncFromServer();
    window.addEventListener("fashion:published-cache-updated", syncFromCache);
    window.addEventListener("storage", syncFromCache);

    const pollHandle =
      pollIntervalMs > 0
        ? window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            void syncFromServer();
          }, pollIntervalMs)
        : null;

    return () => {
      active = false;
      window.removeEventListener("fashion:published-cache-updated", syncFromCache);
      window.removeEventListener("storage", syncFromCache);
      if (pollHandle !== null) {
        window.clearInterval(pollHandle);
      }
    };
  }, [options?.pollIntervalMs, setFashionViewModel]);
};
