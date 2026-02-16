import { useMemo } from "react";

export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
};

const Tabs = ({ tabs, activeTabId, onChange }: TabsProps) => {
  const activeIndex = useMemo(() => tabs.findIndex((tab) => tab.id === activeTabId), [activeTabId, tabs]);

  return (
    <div className="mb-4">
      <div role="tablist" aria-label="Betting and software tabs" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((tab) => {
          const selected = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => {
                if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                if (event.key === "Home") {
                  onChange(tabs[0].id);
                  return;
                }
                if (event.key === "End") {
                  onChange(tabs[tabs.length - 1].id);
                  return;
                }
                const step = event.key === "ArrowRight" ? 1 : -1;
                const nextIndex = (activeIndex + step + tabs.length) % tabs.length;
                onChange(tabs[nextIndex].id);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
