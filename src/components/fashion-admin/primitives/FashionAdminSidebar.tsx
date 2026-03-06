import type { ReactNode } from "react";
import { cx } from "./utils";

export type FashionAdminNavItem<T extends string> = {
  id: T;
  label: string;
  note?: string;
  rightMeta?: ReactNode;
};

export type FashionAdminNavGroup<T extends string> = {
  title: string;
  items: Array<FashionAdminNavItem<T>>;
};

type FashionAdminSidebarProps<T extends string> = {
  activeItem: T;
  groups: Array<FashionAdminNavGroup<T>>;
  onSelect: (id: T) => void;
  className?: string;
};

const FashionAdminSidebar = <T extends string>({
  activeItem,
  groups,
  onSelect,
  className
}: FashionAdminSidebarProps<T>) => (
  <aside className={cx("fa-card-warm h-fit p-3", className)}>
    <nav className="space-y-4">
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="fa-admin-label px-2">{group.title}</h2>
          <div className="space-y-2">
            {group.items.map((item) => {
              const active = item.id === activeItem;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cx(
                    "w-full rounded-[var(--fa-radius-md)] border px-3 py-3 text-left transition",
                    active ? "fa-sidebar-item-active" : "",
                    active
                      ? "border-[var(--fa-action-primary)] bg-[var(--fa-action-primary)] text-[var(--fa-text-on-dark)]"
                      : "border-[var(--fa-border-soft)] bg-[var(--fa-surface-card)] text-[var(--fa-text-primary)] hover:bg-[var(--fa-surface-card-warm)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{item.label}</p>
                      {item.note ? (
                        <p className={cx("fa-sidebar-note mt-1 text-xs leading-5", active ? "" : "text-[var(--fa-text-secondary)]")}>
                          {item.note}
                        </p>
                      ) : null}
                    </div>
                    {item.rightMeta ? <div className="shrink-0">{item.rightMeta}</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  </aside>
);

export default FashionAdminSidebar;
