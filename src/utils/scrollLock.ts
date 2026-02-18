let lockCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

export const acquireBodyScrollLock = () => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  lockCount += 1;
  if (lockCount === 1) {
    const body = document.body;
    originalOverflow = body.style.overflow;
    originalPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
    }
  }

  let released = false;
  return () => {
    if (released || typeof document === "undefined") return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      const body = document.body;
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
    }
  };
};
