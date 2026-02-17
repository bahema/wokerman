import { useMemo, useState } from "react";
import type { Product } from "../data/siteData";

export type SortOption = "position" | "rating" | "newest" | "az";

export const useProductFilters = (products: Product[]) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("position");

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const indexedProducts = products.map((product, index) => ({ product, index }));
    const filtered = indexedProducts.filter(({ product }) => {
      if (!term) return true;
      return (
        product.title.toLowerCase().includes(term) ||
        product.shortDescription.toLowerCase().includes(term) ||
        product.longDescription.toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered];
    const positionValue = (value: Product["position"], fallback: number) => {
      const numeric = typeof value === "number" ? value : Number(value);
      return Number.isFinite(numeric) ? Math.max(1, Math.round(numeric)) : fallback;
    };

    if (sort === "position") {
      sorted.sort(
        (a, b) =>
          positionValue(a.product.position, Number.MAX_SAFE_INTEGER) - positionValue(b.product.position, Number.MAX_SAFE_INTEGER) ||
          a.index - b.index ||
          a.product.title.localeCompare(b.product.title)
      );
    } else if (sort === "rating") {
      sorted.sort((a, b) => b.product.rating - a.product.rating || a.index - b.index);
    } else if (sort === "newest") {
      sorted.sort((a, b) => Number(b.product.isNew) - Number(a.product.isNew) || b.product.rating - a.product.rating || a.index - b.index);
    } else {
      sorted.sort((a, b) => a.product.title.localeCompare(b.product.title) || a.index - b.index);
    }
    return sorted.map(({ product }) => product);
  }, [products, search, sort]);

  return {
    search,
    sort,
    setSearch,
    setSort,
    filteredProducts
  };
};
