import type { CSSProperties, ReactNode } from "react";

type FashionAdminShellProps = {
  eventThemeVars?: CSSProperties;
  topbar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
};

const FashionAdminShell = ({ eventThemeVars, topbar, sidebar, children }: FashionAdminShellProps) => (
  <div className="fa-admin-root min-h-screen overflow-x-hidden" style={eventThemeVars}>
    {topbar}
    <div className="mx-auto grid max-w-[1700px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
      <aside className="h-fit space-y-4 lg:sticky lg:top-24">{sidebar}</aside>
      <main className="space-y-6">{children}</main>
    </div>
  </div>
);

export default FashionAdminShell;
