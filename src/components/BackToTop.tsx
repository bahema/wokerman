import { useEffect, useState } from "react";

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-4 z-[70] rounded-full bg-blue-600 p-3 text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-500 sm:bottom-6 sm:right-6"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
};

export default BackToTop;
