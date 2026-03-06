import type { ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminPreviewCardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageFallbackClassName?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const FashionAdminPreviewCard = ({
  title,
  subtitle,
  imageUrl,
  imageFallbackClassName,
  actions,
  children,
  className
}: FashionAdminPreviewCardProps) => (
  <article className={cx("fa-card overflow-hidden", className)}>
    {imageUrl ? (
      <img src={imageUrl} alt={title} className="h-44 w-full object-cover" />
    ) : (
      <div className={cx("h-44 w-full bg-[var(--fa-bg-muted)]", imageFallbackClassName)} />
    )}
    <div className="space-y-3 p-4">
      <div>
        <p className="text-base font-bold">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">{subtitle}</p> : null}
      </div>
      {children}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  </article>
);

export default FashionAdminPreviewCard;

