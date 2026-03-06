import { FashionAdminSectionHeader, FashionAdminSidebar as PrimitiveSidebar } from "./primitives";
import type { FashionAdminNavGroup } from "./primitives";

type FashionAdminSidebarProps = {
  activeItem: string;
  groups: FashionAdminNavGroup<string>[];
  onSelect: (id: string) => void;
  headingLabel?: string;
  headingTitle?: string;
  headingDescription?: string;
};

const FashionAdminSidebar = ({
  activeItem,
  groups,
  onSelect,
  headingLabel = "Control rail",
  headingTitle = "Fashion workspaces",
  headingDescription = "This left rail mirrors client-facing pages first, then supporting commerce controls."
}: FashionAdminSidebarProps) => (
  <>
    <FashionAdminSectionHeader className="p-4" label={headingLabel} title={headingTitle} description={headingDescription} />
    <PrimitiveSidebar activeItem={activeItem} groups={groups} onSelect={onSelect} />
  </>
);

export default FashionAdminSidebar;
