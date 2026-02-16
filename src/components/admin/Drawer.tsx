import { useEffect, useRef } from "react";

type DrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Drawer = ({ title, open, onClose, children }: DrawerProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 outline-none dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Drawer;
