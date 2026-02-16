import { useEffect, useMemo, useState } from "react";

export const useSectionObserver = (ids: string[]) => {
  const uniqueIds = useMemo(() => Array.from(new Set(ids)), [ids]);
  const [activeSection, setActiveSection] = useState(uniqueIds[0] ?? "");

  useEffect(() => {
    const elements = uniqueIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;
    if (typeof window.IntersectionObserver !== "function") {
      setActiveSection(elements[0].id);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-25% 0px -45% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [uniqueIds]);

  return activeSection;
};
