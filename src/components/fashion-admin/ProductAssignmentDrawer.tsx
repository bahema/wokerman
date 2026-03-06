import type { FashionProduct } from "../../data/fashionCatalog";

type ProductAssignmentStatus = {
  disabled: boolean;
  badges: string[];
  helperText?: string;
};

type ProductAssignmentDrawerProps = {
  open: boolean;
  title: string;
  subtitle: string;
  sectionLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  products: FashionProduct[];
  previewLabel: string;
  previewProducts: FashionProduct[];
  getStatus: (product: FashionProduct) => ProductAssignmentStatus;
  onSelect: (product: FashionProduct) => void;
  onClose: () => void;
  enforceUniquePerPage: boolean;
};

const ProductAssignmentDrawer = ({
  open,
  title,
  subtitle,
  sectionLabel,
  query,
  onQueryChange,
  products,
  previewLabel,
  previewProducts,
  getStatus,
  onSelect,
  onClose,
  enforceUniquePerPage
}: ProductAssignmentDrawerProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.55)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Product assignment</p>
            <h3 className="mt-1 text-xl font-black">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close product assignment" className="fa-btn fa-btn-ghost rounded-full px-4 py-2 text-sm">
            Close
          </button>
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl border border-black/8 bg-[#f8f5f0] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="text-xs text-slate-600">
            <span className="font-semibold">{sectionLabel}</span>
            {enforceUniquePerPage ? " • This page enforces one-product-once visibility." : " • Duplicates across page are allowed."}
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search product by name, collection, category, or tag"
            className="fa-input w-full min-w-[220px] md:w-[24rem]"
            aria-label="Search products for assignment"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="max-h-[56dvh] space-y-3 overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/12 px-4 py-5 text-sm text-slate-600">No products match this search.</div>
            ) : (
              products.map((product) => {
                const status = getStatus(product);
                return (
                  <div key={product.id} className={`rounded-2xl border bg-white p-4 ${status.disabled ? "border-black/10 opacity-75" : "border-black/12"}`}>
                    <div className="flex gap-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-black/8 bg-[#f5efe7]">
                        {product.primaryImage || product.detailImage || product.stylingImage ? (
                          <img
                            src={product.primaryImage || product.detailImage || product.stylingImage}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className={`h-full w-full ${product.palette}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{product.collection} • {product.category}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {status.badges.map((badge) => (
                            <span key={`${product.id}-${badge}`} className="rounded-full border border-black/10 bg-[#f7f3ed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {badge}
                            </span>
                          ))}
                        </div>
                        {status.helperText ? <p className="mt-2 text-xs text-slate-500">{status.helperText}</p> : null}
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2">
                        <span className="rounded-full bg-[#1f1712] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">${product.price}</span>
                        <button
                          type="button"
                          onClick={() => onSelect(product)}
                          disabled={status.disabled}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            status.disabled ? "border border-black/10 bg-white text-slate-400" : "fa-btn fa-btn-primary"
                          }`}
                        >
                          {status.disabled ? "Not available" : "Select"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{previewLabel}</p>
            <p className="mt-1 text-sm text-slate-600">Current order preview before save/publish.</p>
            <div className="mt-3 max-h-[48dvh] space-y-2 overflow-y-auto pr-1">
              {previewProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/12 bg-white px-3 py-4 text-xs text-slate-500">No products assigned yet.</div>
              ) : (
                previewProducts.map((product, index) => (
                  <div key={`preview-${product.id}-${index}`} className="rounded-xl border border-black/10 bg-white px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-slate-800">#{index + 1} {product.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{product.collection} • {product.category}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAssignmentDrawer;
