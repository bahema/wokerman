let lockCount = 0;
let lockedScrollY = 0;
let originalOverflow = "";
let originalPosition = "";
let originalTop = "";
let originalLeft = "";
let originalRight = "";
let originalWidth = "";

export const acquireBodyScrollLock = () => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  lockCount += 1;
  if (lockCount === 1) {
    const body = document.body;
    lockedScrollY = window.scrollY;
    originalOverflow = body.style.overflow;
    originalPosition = body.style.position;
    originalTop = body.style.top;
    originalLeft = body.style.left;
    originalRight = body.style.right;
    originalWidth = body.style.width;

    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }

  let released = false;
  return () => {
    if (released || typeof document === "undefined") return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      const body = document.body;
      body.style.overflow = originalOverflow;
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.left = originalLeft;
      body.style.right = originalRight;
      body.style.width = originalWidth;
      window.scrollTo(0, lockedScrollY);
    }
  };
};
