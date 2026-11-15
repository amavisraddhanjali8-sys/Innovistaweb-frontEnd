import styles from "../cssModules/ServiceComponet.module.css";
import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { detectHorizontalSwipe } from "../utils/touchGestureHelpers";

export type Service = {
  id?: string;
  image: string;
  title: string;
  description1: string;
  description2: string;
};

gsap.registerPlugin(ScrollTrigger);

function ServiceComponent({
  items,
  duration = 5000,
}: {
  items: Service[];
  duration?: number;
}) {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const textRefs = useRef<(HTMLDivElement | HTMLSpanElement)[]>([]);
  const imageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const safeIndex = items.length > 0 ? index % items.length : 0;

  useEffect(() => {
    if (items.length > 0 && index >= items.length) {
      setIndex(0);
    }
  }, [items.length, index]);

  const displayItems = useMemo(() => {
    if (items.length === 0) return [];
    const stackSize = Math.min(4, items.length);
    const currentItems: Service[] = [];
    for (let offset = 0; offset < stackSize; offset++) {
      currentItems.push(items[(safeIndex + offset) % items.length]);
    }
    return currentItems;
  }, [items, safeIndex]);

  useEffect(() => {
    if (!isAnimating || items.length <= 1) return;

    const timeout = setTimeout(() => {
      setIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, duration);

    return () => clearTimeout(timeout);
  }, [safeIndex, isAnimating, items.length, duration]);

  useEffect(() => {
    if (textRefs.current.length > 0 && displayItems.length > 0) {
      const tl = gsap.timeline();

      tl.fromTo(
        textRefs.current[0],
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      )
        .fromTo(
          textRefs.current[1],
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
          "+=0.1"
        )
        .fromTo(
          textRefs.current[2],
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
          "+=0.1"
        );
    }
  }, [safeIndex, displayItems.length]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    const isNarrow =
      typeof window !== "undefined" && window.innerWidth <= 900;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: contentRef.current,
        start: "top 85%",
        end: "top 40%",
        toggleActions: "play none none reverse",
        onEnter: () => setIsAnimating(true),
        onEnterBack: () => setIsAnimating(false),
      },
    });

    if (imageRef.current && textContainerRef.current) {
      tl.fromTo(
        imageRef.current,
        isNarrow ? { y: 24, x: 0, opacity: 0 } : { x: -60, y: 0, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }
      );

      tl.fromTo(
        textContainerRef.current,
        isNarrow ? { y: 20, x: 0, opacity: 0 } : { x: 40, y: 0, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: "power2.out" },
        "<0.1"
      );
    }

    return () => {
      mm.revert();
    };
  }, []);

  const goToService = (serviceIndex: number) => {
    if (items.length === 0) return;
    setIndex(serviceIndex % items.length);
  };

  if (items.length === 0) {
    return null;
  }

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch || items.length <= 1) return;
    const dir = detectHorizontalSwipe(
      start.x,
      start.y,
      touch.clientX,
      touch.clientY,
      Date.now() - start.t
    );
    if (dir === "left") {
      setIndex((prevIndex) => (prevIndex + 1) % items.length);
    } else if (dir === "right") {
      setIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
    }
  };

  return (
    <div
      className={styles.container}
      ref={contentRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.imageContainer} ref={imageRef}>
        {displayItems.map((item, i) => (
          <img
            src={item.image}
            alt={item.title}
            referrerPolicy="no-referrer"
            key={`${item.id || item.title}-${safeIndex}-${i}`}
            className={styles[`image${i + 1}`]}
          />
        ))}
      </div>

      <div className={styles.textContainer} ref={textContainerRef}>
        <div className={styles.textContent}>
          <span
            className={styles.title}
            ref={(el) => {
              if (el) textRefs.current[0] = el;
            }}
          >
            {displayItems[0]?.title}
          </span>
          <p
            className={styles.description}
            ref={(el) => {
              if (el) textRefs.current[1] = el;
            }}
          >
            {displayItems[0]?.description1}
          </p>
          <p
            className={styles.description}
            ref={(el) => {
              if (el) textRefs.current[2] = el;
            }}
          >
            {displayItems[0]?.description2}
          </p>
        </div>

        <div className={styles.buttonContainer}>
          <span className="tactile-pill-frame" data-tone="navy">
            <button
              type="button"
              aria-label="Previous service"
              data-tone="navy"
              className="tactile-pill-btn cursor-target"
              onClick={() =>
                setIndex(
                  (prevIndex) => (prevIndex - 1 + items.length) % items.length
                )
              }
            >
              <FaArrowLeft className="relative z-10" />
            </button>
          </span>
          <span className="tactile-pill-frame" data-tone="azure">
            <button
              type="button"
              aria-label="Next service"
              data-tone="azure"
              className="tactile-pill-btn cursor-target"
              onClick={() =>
                setIndex((prevIndex) => (prevIndex + 1) % items.length)
              }
            >
              <FaArrowRight className="relative z-10" />
            </button>
          </span>
        </div>

        <div className={styles.mobileIndicators}>
          {items.map((_, i) => (
            <button
              type="button"
              key={i}
              className={`${styles.indicator} ${
                i === safeIndex ? styles.indicatorActive : ""
              }`}
              onClick={() => goToService(i)}
              aria-label={`Go to service ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ServiceComponent;
