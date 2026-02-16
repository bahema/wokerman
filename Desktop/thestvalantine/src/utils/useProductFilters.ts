import { useMemo, useState } from "react";
import type { Product } from "../data/siteData";

export type SortOption = "position" | "rating" | "newest" | "az";

export const useProductFilters = (products: Product[]) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("position");

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
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
      sorted.sort((a, b) => positionValue(a.position, Number.MAX_SAFE_INTEGER) - positionValue(b.position, Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title));
    } else if (sort === "rating") {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sort === "newest") {
      sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.rating - a.rating);
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [products, search, sort]);

  return {
    search,
    sort,
    setSearch,
    setSort,
    filteredProducts
  };
};
