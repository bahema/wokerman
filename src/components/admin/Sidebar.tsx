export type AdminSection =
  | "pre-deploy-checklist"
  | "system-health"
  | "ai-control"
  | "traffic-ai"
  | "email-analytics"
  | "email-sender"
  | "top-nav-links"
  | "account-settings"
  | "analytics"
  | "product-media"
  | "branding"
  | "social-links"
  | "hero"
  | "hero-2"
  | "adsection-man"
  | "testimonials"
  | "industries"
  | "footer"
  | "products-forex"
  | "products-betting"
  | "products-software"
  | "products-social"
  | "products-supplements"
  | "products-gadgets"
  | "health-upcoming";

type SidebarProps = {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
};

type SidebarItem = { label: string; key?: AdminSection; href?: string };

const groups: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: "Operations",
    items: [
      { key: "pre-deploy-checklist", label: "Pre-Deploy Checklist" },
      { key: "system-health", label: "System Health" },
      { key: "ai-control", label: "AI Control Center" },
      { key: "traffic-ai", label: "Traffic AI" }
    ]
  },
  {
    title: "Site Setup",
    items: [
      { key: "analytics", label: "Analytics" },
      { key: "product-media", label: "Product Media" },
      { key: "branding", label: "Branding & Theme" },
      { key: "social-links", label: "Social Links" }
    ]
  },
  {
    title: "Homepage",
    items: [
      { key: "hero", label: "Hero" },
      { key: "hero-2", label: "Hero 2" },
      { key: "adsection-man", label: "Adsection Man" },
      { key: "testimonials", label: "Testimonials" },
      { key: "industries", label: "Industries Slider" },
      { key: "footer", label: "Footer" }
    ]
  },
  {
    title: "Products",
    items: [
      { key: "products-forex", label: "Forex" },
      { key: "products-betting", label: "Betting" },
      { key: "products-software", label: "New Released Software" },
      { key: "products-social", label: "Social Automation" },
      { key: "products-supplements", label: "Supplements" },
      { key: "products-gadgets", label: "Gadgets" },
      { key: "health-upcoming", label: "Health Upcoming" }
    ]
  },
  {
    title: "Account",
    items: [
      { key: "email-analytics", label: "Email Analytics" },
      { key: "email-sender", label: "Email Sender" },
      { key: "top-nav-links", label: "Top Nav Links" },
      { href: "/boss/fashion/videos", label: "Fashion videos" },
      { href: "/boss/fashion", label: "Fashion" },
      { key: "account-settings", label: "Account Settings" }
    ]
  }
];

const Sidebar = ({ active, onSelect }: SidebarProps) => (
  <aside className="w-full lg:w-72">
    <div className="sticky top-20 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95">
      {groups.map((group) => (
        <div key={group.title} className="mb-5 last:mb-0">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{group.title}</h4>
          <div className="space-y-1">
            {group.items.map((item) => (
              <button
                key={item.key ?? item.href ?? item.label}
                type="button"
                onClick={() => {
                  if (item.href) {
                    window.open(item.href, "_blank", "noopener,noreferrer");
                    return;
                  }
                  if (item.key) {
                    onSelect(item.key);
                  }
                }}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  item.href
                    ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900/60"
                    : item.key && active === item.key
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </aside>
);

export default Sidebar;
