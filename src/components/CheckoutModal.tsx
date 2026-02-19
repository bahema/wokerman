import type { Product } from "../data/siteData";
import ModalShell from "./ModalShell";

type CheckoutModalProps = {
  product: Product | null;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const CheckoutModal = ({ product, onClose, returnFocusTo }: CheckoutModalProps) => {
  const open = Boolean(product);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      labelledBy="checkout-modal-title"
      title="Proceed to Checkout"
      closeAriaLabel="Close checkout modal"
      maxWidthClassName="max-w-md"
    >
      {product ? (
        <>
          <p className="mb-6 break-words text-sm text-slate-300">
            Confirm checkout for <span className="font-semibold text-white">{product.title}</span>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={product.checkoutLink}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              onClick={onClose}
              className="inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Continue
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-fit max-w-full items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}
    </ModalShell>
  );
};

export default CheckoutModal;
