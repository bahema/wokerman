import { useEffect, useState } from "react";
import type { FashionProduct } from "../data/fashionCatalog";
import { withBasePath } from "../utils/basePath";

type FashionProductImageVariant = "auto" | "primary" | "detail" | "styling";

const getVariantSource = (product: FashionProduct, variant: Exclude<FashionProductImageVariant, "auto">) => {
  switch (variant) {
    case "primary":
      return product.primaryImage?.trim() || "";
    case "detail":
      return product.detailImage?.trim() || "";
    case "styling":
      return product.stylingImage?.trim() || "";
  }
};

const resolveProductImageSrc = (product: FashionProduct, variant: FashionProductImageVariant) => {
  const primary = product.primaryImage?.trim() || "";
  const detail = product.detailImage?.trim() || "";
  const styling = product.stylingImage?.trim() || "";

  switch (variant) {
    case "primary":
      return primary || detail || styling || "";
    case "detail":
      return detail || primary || styling || "";
    case "styling":
      return styling || primary || detail || "";
    default:
      return primary || detail || styling || "";
  }
};

type FashionProductImageProps = {
  product: FashionProduct | null | undefined;
  alt: string;
  className: string;
  fallbackClassName?: string;
  variant?: FashionProductImageVariant;
  useCrossSlotFallback?: boolean;
  missingLabel?: string;
};

const FashionProductImage = ({
  product,
  alt,
  className,
  fallbackClassName,
  variant = "auto",
  useCrossSlotFallback = true,
  missingLabel
}: FashionProductImageProps) => {
  const directVariantSource =
    product && variant !== "auto" ? getVariantSource(product, variant as Exclude<FashionProductImageVariant, "auto">) : "";
  const source = product ? (variant === "auto" || useCrossSlotFallback ? resolveProductImageSrc(product, variant) : directVariantSource) : "";
  const fallbackSource = withBasePath("/logo.png");
  const [src, setSrc] = useState(source || fallbackSource);

  useEffect(() => {
    setSrc(source || fallbackSource);
  }, [source, fallbackSource]);

  if (!product) {
    return <div className={`${className} ${fallbackClassName ?? ""}`} />;
  }

  if (variant !== "auto" && !useCrossSlotFallback && !directVariantSource) {
    return (
      <div className={`${className} flex items-center justify-center rounded-[inherit] border border-dashed border-white/15 bg-black/20 px-3 text-center ${fallbackClassName ?? ""}`}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">{missingLabel ?? `${variant} image missing`}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-cover`}
      onError={() => {
        if (src !== fallbackSource) setSrc(fallbackSource);
      }}
    />
  );
};

export default FashionProductImage;
