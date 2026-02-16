import Sidebar, { type AdminSection } from "./Sidebar";

type AdminLayoutProps = {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  children: React.ReactNode;
  previewPane?: React.ReactNode;
};

const AdminLayout = ({ activeSection, onSectionChange, children, previewPane }: AdminLayoutProps) => (
  <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="flex flex-col gap-6 lg:flex-row">
      <Sidebar active={activeSection} onSelect={onSectionChange} />
      <main className="min-w-0 flex-1 space-y-6">{children}</main>
      {previewPane ? <aside className="w-full xl:w-80">{previewPane}</aside> : null}
    </div>
  </div>
);

export default AdminLayout;
