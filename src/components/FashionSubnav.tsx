import { useState } from "react";
import { withBasePath } from "../utils/basePath";
import { getFashionClientViewModel } from "../utils/fashionDraft";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";

type FashionNavItem = {
  path: string;
  label: string;
};

type FashionSubnavProps = {
  currentPath: string;
};

const FashionSubnav = ({ currentPath }: FashionSubnavProps) => {
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());

  useFashionPublishedSync(setFashionViewModel, undefined, { pollIntervalMs: 0 });

  const fashionNavItems: FashionNavItem[] = [
    { path: "/fashion", label: fashionViewModel.homepage.footerLinkHomeLabel || "New Arrivals" },
    { path: "/fashion/editorial", label: fashionViewModel.homepage.footerLinkEditorialLabel || "Editorial" },
    { path: "/fashion/collections", label: fashionViewModel.homepage.footerLinkCollectionsLabel || "Collections" },
    { path: "/fashion/style-notes", label: fashionViewModel.homepage.footerLinkStyleNotesLabel || "Style Notes" }
  ];

  return (
    <div className="sticky top-16 z-40 border-b border-black/8 bg-[#f6f1ea]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0d0b]/90">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {fashionNavItems.map((item) => {
          const isActive = item.path === currentPath;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                window.history.pushState({}, "", withBasePath(item.path));
                window.dispatchEvent(new PopStateEvent("popstate"));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#1a1714] text-white dark:bg-[#f8f2eb] dark:text-[#15120f]"
                  : "bg-white/70 text-[#4b433c] hover:bg-white dark:bg-white/5 dark:text-[#d6c6b6] dark:hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FashionSubnav;
