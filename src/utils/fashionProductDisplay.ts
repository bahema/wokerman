import type { FashionProduct } from "../data/fashionCatalog";

export type FashionDisplayConfig = {
  enforceUniquePerPage: boolean;
  relatedProductLimit: number;
};

export const defaultFashionDisplayConfig: FashionDisplayConfig = {
  enforceUniquePerPage: true,
  relatedProductLimit: 3
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeFashionDisplayConfig = (value?: Partial<FashionDisplayConfig> | null): FashionDisplayConfig => ({
  enforceUniquePerPage: value?.enforceUniquePerPage ?? defaultFashionDisplayConfig.enforceUniquePerPage,
  relatedProductLimit: clamp(Number(value?.relatedProductLimit ?? defaultFashionDisplayConfig.relatedProductLimit), 1, 6)
});

export const dedupeProductsById = (products: FashionProduct[]) => {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
};

const prioritizeCollectionDiversity = (products: FashionProduct[]) => {
  if (products.length <= 2) return products;
  const queue = [...products];
  const diverse: FashionProduct[] = [];
  let lastCollection = "";

  while (queue.length > 0) {
    const index = queue.findIndex((product) => product.collection !== lastCollection);
    const nextIndex = index >= 0 ? index : 0;
    const [next] = queue.splice(nextIndex, 1);
    diverse.push(next);
    lastCollection = next.collection;
  }

  return diverse;
};

type PageBlockSelectionInput = {
  assigned: FashionProduct[];
  fallback: FashionProduct[];
  allProducts: FashionProduct[];
  limit: number;
  usedIds: Set<string>;
  enforceUniquePerPage: boolean;
};

export const selectPageBlockProducts = (input: PageBlockSelectionInput) => {
  const pools = [
    dedupeProductsById(input.assigned),
    dedupeProductsById(input.fallback),
    dedupeProductsById(input.allProducts)
  ];
  const picked: FashionProduct[] = [];
  const pickedIds = new Set<string>();

  for (const pool of pools) {
    for (const product of pool) {
      if (picked.length >= input.limit) break;
      if (pickedIds.has(product.id)) continue;
      if (input.enforceUniquePerPage && input.usedIds.has(product.id)) continue;
      picked.push(product);
      pickedIds.add(product.id);
    }
    if (picked.length >= input.limit) break;
  }

  const finalSelection = prioritizeCollectionDiversity(picked).slice(0, input.limit);
  if (input.enforceUniquePerPage) {
    finalSelection.forEach((product) => input.usedIds.add(product.id));
  }

  return finalSelection;
};

type RelatedSelectionInput = {
  selectedProduct: FashionProduct | null;
  allProducts: FashionProduct[];
  excludeIds?: Iterable<string>;
  limit: number;
};

export const selectRelatedProducts = ({ selectedProduct, allProducts, excludeIds, limit }: RelatedSelectionInput) => {
  if (!selectedProduct) return [];
  const exclusion = new Set(excludeIds ?? []);
  exclusion.add(selectedProduct.id);

  const ranked = dedupeProductsById(
    allProducts
      .filter((product) => !exclusion.has(product.id))
      .sort((a, b) => {
        const aScore =
          (a.collection === selectedProduct.collection ? 3 : 0) +
          (a.category === selectedProduct.category ? 2 : 0) +
          (a.tone === selectedProduct.tone ? 1 : 0);
        const bScore =
          (b.collection === selectedProduct.collection ? 3 : 0) +
          (b.category === selectedProduct.category ? 2 : 0) +
          (b.tone === selectedProduct.tone ? 1 : 0);
        return bScore - aScore;
      })
  );

  return prioritizeCollectionDiversity(ranked).slice(0, limit);
};
