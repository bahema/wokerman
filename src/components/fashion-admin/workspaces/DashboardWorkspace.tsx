import { FashionAdminButton, FashionAdminCard } from "../primitives";
import { withBasePath } from "../../../utils/basePath";

type DashboardWorkspaceProps = {
  sectionCard: string;
  workspaceCounts: Array<[string, string | number]>;
  previewLinks: Array<[string, string]>;
};

const DashboardWorkspace = ({ sectionCard, workspaceCounts, previewLinks }: DashboardWorkspaceProps) => (
  <>
    <section className={`${sectionCard} grid gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
      {workspaceCounts.map(([label, value]) => (
        <FashionAdminCard key={label} className="p-4">
          <p className="fa-admin-label">{label}</p>
          <p className="mt-3 text-3xl font-black">{value}</p>
        </FashionAdminCard>
      ))}
    </section>
    <section className={sectionCard}>
      <div className="flex flex-wrap gap-3">
        {previewLinks.map(([label, path]) => (
          <FashionAdminButton key={path} onClick={() => window.open(withBasePath(path), "_blank", "noopener,noreferrer")}>
            {label}
          </FashionAdminButton>
        ))}
      </div>
    </section>
  </>
);

export default DashboardWorkspace;
