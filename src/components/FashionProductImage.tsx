import { useEffect, useState } from "react";
import type { FashionProduct } from "../data/fashionCatalog";
import { withBasePath } from "../utils/basePath";

const resolveProductImageSrc = (product: FashionProduct) =>
  product.primaryImage?.trim() || product.detailImage?.trim() || product.stylingImage?.trim() || "";

type FashionProductImageProps = {
  product: FashionProduct | null | undefined;
  alt: string;
  className: string;
  fallbackClassName?: string;
};

const FashionProductImage = ({ product, alt, className, fallbackClassName }: FashionProductImageProps) => {
  const source = product ? resolveProductImageSrc(product) : "";
  const fallbackSource = withBasePath("/logo.png");
  const [src, setSrc] = useState(source || fallbackSource);

  useEffect(() => {
    setSrc(source || fallbackSource);
  }, [source, fallbackSource]);

  if (!product) {
    return <div className={`${className} ${fallbackClassName ?? ""}`} />;
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
