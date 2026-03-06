import type { ReactNode } from "react";
import { FashionAdminTopbar as PrimitiveTopbar } from "./primitives";

type FashionAdminTopbarProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  actions?: ReactNode;
};

const FashionAdminTopbar = (props: FashionAdminTopbarProps) => <PrimitiveTopbar {...props} />;

export default FashionAdminTopbar;
