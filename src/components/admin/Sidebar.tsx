export type AdminSection =
  | "email-analytics"
  | "email-sender"
  | "account-settings"
  | "analytics"
  | "product-media"
  | "branding"
  | "social-links"
  | "hero"
  | "adsection-man"
  | "testimonials"
  | "industries"
  | "footer"
  | "products-forex"
  | "products-betting"
  | "products-software"
  | "products-social";

type SidebarProps = {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
};

const groups: Array<{ title: string; items: Array<{ key: AdminSection; label: string }> }> = [
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
      { key: "products-social", label: "Social Automation" }
    ]
  },
  {
    title: "Account",
    items: [
      { key: "email-analytics", label: "Email Analytics" },
      { key: "email-sender", label: "Email Sender" },
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
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  active === item.key
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
