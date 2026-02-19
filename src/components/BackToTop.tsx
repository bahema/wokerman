import { useEffect, useState } from "react";

const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onViewportChange = () => setIsMobile(window.innerWidth < 640);
    onViewportChange();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (isMobile) {
        setVisible(window.scrollY > 120);
        return;
      }
      const viewportBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight;
      setVisible(viewportBottom >= pageBottom - 48);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  if (!visible) return null;

  const bottomOffset = isMobile
    ? "calc(env(safe-area-inset-bottom) + 4.25rem)"
    : "max(1rem, env(safe-area-inset-bottom))";

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-3 z-[1050] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-blue-600 px-4 py-2 text-white shadow-[0_12px_28px_-10px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 hover:bg-blue-500 sm:right-6"
      style={{ bottom: bottomOffset }}
      aria-label="Back to top"
    >
      <span aria-hidden="true" className="text-base leading-none">
        ↑
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Fresh Up</span>
    </button>
  );
};

export default BackToTop;
