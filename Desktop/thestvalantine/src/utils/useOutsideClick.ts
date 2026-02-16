import { RefObject, useEffect } from "react";

export const useOutsideClick = <T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;
      if (!node || node.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [enabled, handler, ref]);
};
