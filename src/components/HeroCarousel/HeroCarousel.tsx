import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import "./HeroCarousel.css";
import { getFashionLikesSummary, toggleFashionLike, type FashionLikeScope } from "../../utils/fashionLikes";

export type HeroSlide = {
  id: string;
  imageUrl: string;
  source?: string;
  timeAgo?: string;
  headline: string;
  likes?: number;
  href?: string;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
  initialIndex?: number;
  autoAdvanceMs?: number;
  className?: string;
  likesScope?: FashionLikeScope;
};

const DRAG_THRESHOLD = 60;

const HeroCarouselComponent = ({ slides, initialIndex = 0, autoAdvanceMs = 0, className, likesScope }: HeroCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(() => (slides.length ? Math.min(initialIndex, slides.length - 1) : 0));
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [likesBySlide, setLikesBySlide] = useState<Record<string, number>>({});
  const [likedBySlide, setLikedBySlide] = useState<Record<string, boolean>>({});
  const [likeNotice, setLikeNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);
  const dragStartedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const totalSlides = slides.length;

  const syncTrack = useCallback(
    (nextIndex: number, offset = 0, dragging = false) => {
      const track = trackRef.current;
      if (!track || totalSlides === 0) return;
      track.style.transition = dragging ? "none" : "transform 350ms ease";
      track.style.transform = `translateX(calc(-${nextIndex * 100}% + ${offset}px))`;
    },
    [totalSlides]
  );

  const goTo = useCallback(
    (index: number) => {
      if (totalSlides === 0) return;
      const nextIndex = (index + totalSlides) % totalSlides;
      setActiveIndex(nextIndex);
      setDragOffset(0);
      setIsDragging(false);
    },
    [totalSlides]
  );

  const next = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  const prev = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    syncTrack(activeIndex, dragOffset, isDragging);
  }, [activeIndex, dragOffset, isDragging, syncTrack]);

  useEffect(() => {
    if (!autoAdvanceMs || totalSlides < 2 || isDragging) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % totalSlides);
    }, autoAdvanceMs);
    return () => window.clearInterval(timer);
  }, [autoAdvanceMs, isDragging, totalSlides]);

  useEffect(() => {
    if (!likesScope || slides.length === 0) return;
    let active = true;
    void getFashionLikesSummary(
      likesScope,
      slides.map((slide) => ({ id: slide.id, seedLikes: typeof slide.likes === "number" ? slide.likes : 0 }))
    )
      .then((summary) => {
        if (!active) return;
        setLikesBySlide(summary.counts ?? {});
        setLikedBySlide(summary.liked ?? {});
      })
      .catch(() => {
        if (!active) return;
      });
    return () => {
      active = false;
    };
  }, [likesScope, slides]);

  useEffect(() => {
    if (!likeNotice) return;
    const timer = window.setTimeout(() => setLikeNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [likeNotice]);

  useEffect(() => {
    if (totalSlides < 2) return;
    const neighbors = [slides[(activeIndex - 1 + totalSlides) % totalSlides], slides[(activeIndex + 1) % totalSlides]];
    neighbors.forEach((slide) => {
      if (!slide?.imageUrl) return;
      const img = new Image();
      img.src = slide.imageUrl;
    });
  }, [activeIndex, slides, totalSlides]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    };

    node.addEventListener("keydown", handleKeyDown);
    return () => node.removeEventListener("keydown", handleKeyDown);
  }, [next, prev]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const scheduleDragUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setDragOffset(deltaXRef.current);
    });
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (totalSlides < 2) return;
    if (event.target instanceof Element && event.target.closest("[data-carousel-control='true']")) {
      return;
    }
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    deltaXRef.current = 0;
    dragStartedRef.current = false;
    suppressClickRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId || !isDragging) return;
    deltaXRef.current = event.clientX - startXRef.current;
    if (Math.abs(deltaXRef.current) > 4) {
      dragStartedRef.current = true;
      suppressClickRef.current = true;
    }
    scheduleDragUpdate();
  };

  const finishDrag = useCallback(() => {
    const delta = deltaXRef.current;
    const shouldSlide = Math.abs(delta) > DRAG_THRESHOLD;

    if (shouldSlide) {
      goTo(activeIndex + (delta < 0 ? 1 : -1));
    } else {
      setDragOffset(0);
      setIsDragging(false);
    }

    deltaXRef.current = 0;
    pointerIdRef.current = null;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, [activeIndex, goTo]);

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finishDrag();
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragOffset(0);
    setIsDragging(false);
    deltaXRef.current = 0;
    pointerIdRef.current = null;
    suppressClickRef.current = false;
  };

  const handleSlideClick = (slide: HeroSlide) => {
    if (!slide.href || suppressClickRef.current || dragStartedRef.current) return;
    window.location.assign(slide.href);
  };

  const handleLikeToggle = async (slide: HeroSlide) => {
    if (!likesScope) return;
    try {
      const result = await toggleFashionLike(likesScope, slide.id, typeof slide.likes === "number" ? slide.likes : 0);
      setLikesBySlide((current) => ({ ...current, [slide.id]: result.count }));
      setLikedBySlide((current) => ({ ...current, [slide.id]: result.liked }));
      setLikeNotice(result.liked ? "Added to likes." : "Like removed.");
    } catch {
      setLikeNotice("Unable to update like right now.");
    }
  };

  const trackStyle = useMemo(
    () => ({
      transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
      transition: isDragging ? "none" : "transform 350ms ease"
    }),
    [activeIndex, dragOffset, isDragging]
  );

  if (totalSlides === 0) return null;

  return (
    <div
      ref={rootRef}
      className={["hero-carousel", className].filter(Boolean).join(" ")}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Hero stories"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={(event) => {
        if (pointerIdRef.current === event.pointerId && isDragging) {
          handlePointerUp(event);
        }
      }}
    >
      <div ref={trackRef} className="hero-carousel__track" style={trackStyle}>
        {slides.map((slide) => (
          <div key={slide.id} className="hero-carousel__slide">
            <img src={slide.imageUrl} alt={slide.headline} className="hero-carousel__image" draggable={false} />
            <div className="hero-carousel__overlay" />
            {slide.href ? (
              <button
                type="button"
                className="hero-carousel__link"
                data-carousel-control="true"
                aria-label={`Open ${slide.headline}`}
                onClick={() => handleSlideClick(slide)}
              />
            ) : null}
            <div className="hero-carousel__content">
              {(slide.source || slide.timeAgo) && (
                <div className="hero-carousel__meta">
                  {slide.source ? <span>{slide.source}</span> : null}
                  {slide.timeAgo ? <span>{slide.timeAgo}</span> : null}
                </div>
              )}
              <p className="hero-carousel__headline">{slide.headline}</p>
              {typeof slide.likes === "number" || typeof likesBySlide[slide.id] === "number" ? (
                <div className="hero-carousel__likes">
                  {likesScope ? (
                    <button
                      type="button"
                      data-carousel-control="true"
                      className={`hero-carousel__like-button${likedBySlide[slide.id] ? " hero-carousel__like-button--active" : ""}`}
                      onClick={() => {
                        void handleLikeToggle(slide);
                      }}
                      aria-label={likedBySlide[slide.id] ? "Remove like" : "Add like"}
                    >
                      <span className="hero-carousel__icon" aria-hidden="true">
                        ♥
                      </span>
                    </button>
                  ) : (
                    <span className="hero-carousel__icon" aria-hidden="true">
                      ♥
                    </span>
                  )}
                  <span>{(likesBySlide[slide.id] ?? slide.likes ?? 0).toLocaleString()}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {totalSlides > 1 ? (
        <>
          <button
            type="button"
            className="hero-carousel__control hero-carousel__control--prev"
            data-carousel-control="true"
            onClick={prev}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-carousel__control hero-carousel__control--next"
            data-carousel-control="true"
            onClick={next}
            aria-label="Next slide"
          >
            ›
          </button>
          <div className="hero-carousel__dots" role="tablist" aria-label="Choose hero slide">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Go to slide ${index + 1}`}
                data-carousel-control="true"
                className={`hero-carousel__dot${index === activeIndex ? " hero-carousel__dot--active" : ""}`}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </>
      ) : null}
      {likeNotice ? <div className="hero-carousel__notice">{likeNotice}</div> : null}
    </div>
  );
};

const HeroCarousel = memo(HeroCarouselComponent);

export default HeroCarousel;
