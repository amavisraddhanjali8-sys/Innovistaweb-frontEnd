import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useAuth } from "../Context/AuthContext";
import {
  DEFAULT_SLIDESHOW_SPEED_MS,
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  type HeroSlide,
} from "../utils/aboutContentHelpers";

interface ShowcaseHeroSlideshowProps {
  slides: HeroSlide[];
  slideshowSpeedMs?: number;
  ariaLabel: string;
  eyebrowText?: string;
  hideSubheadline?: boolean;
  backLink?: { label: string; to: string };
  adminManageTo?: string;
  adminManageLabel?: string;
}

export default function ShowcaseHeroSlideshow({
  slides,
  slideshowSpeedMs,
  ariaLabel,
  eyebrowText,
  hideSubheadline = false,
  backLink,
  adminManageTo,
  adminManageLabel = "Manage Slideshow",
}: ShowcaseHeroSlideshowProps) {
  const { user } = useAuth();
  const activeSlides = slides && slides.length > 0 ? slides : [];
  const speedMs = clampSlideshowSpeedMs(
    slideshowSpeedMs ?? DEFAULT_SLIDESHOW_SPEED_MS
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeIndex =
    activeSlides.length === 0 || currentIndex >= activeSlides.length
      ? 0
      : currentIndex;
  const currentSlide = activeSlides[safeIndex];

  const firstSlideId = activeSlides[0]?.id;
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeSlides.length, firstSlideId]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => getNextSlideIndex(prev, activeSlides.length));
  }, [activeSlides.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => getPrevSlideIndex(prev, activeSlides.length));
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => getNextSlideIndex(prev, activeSlides.length));
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [activeSlides.length, isPaused, speedMs]);

  if (!currentSlide) return null;

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={ariaLabel}
        aria-roledescription="carousel"
        data-speed-ms={speedMs}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="relative w-full overflow-hidden bg-gradient-to-b from-[#3393B8] via-[#5CB6D2] to-white pt-8 sm:pt-11 pb-0"
      >
        {/* Top Utility Strip (Back link on Category pages / Admin Quick Edit) */}
        {(backLink || (user?.role === "admin" && adminManageTo)) && (
          <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 mb-2">
            <div>
              {backLink && (
                <Link
                  to={backLink.to}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/30 transition-colors whitespace-nowrap no-underline"
                >
                  <LeftOutlined className="text-[10px]" />
                  <span>{backLink.label}</span>
                </Link>
              )}
            </div>

            {user?.role === "admin" && adminManageTo && (
              <Link
                to={adminManageTo}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 hover:bg-white text-neutral-900 px-3.5 py-1.5 text-xs font-semibold shadow-sm border border-white/70 transition-colors whitespace-nowrap no-underline"
              >
                {adminManageLabel} ({(speedMs / 1000).toFixed(1)}s)
              </Link>
            )}
          </div>
        )}

        {/* Centered Dynamic Slide Headline & Subtitle */}
        <div
          className={`relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center flex flex-col justify-center ${
            hideSubheadline
              ? "min-h-[84px] sm:min-h-[104px]"
              : "min-h-[128px] sm:min-h-[154px]"
          }`}
        >
          {eyebrowText && (
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/90 mb-1.5">
              {eyebrowText}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  textWrap: "balance",
                }}
                className="text-[32px] sm:text-[44px] lg:text-[52px] font-semibold tracking-tight leading-[1.12] text-white"
              >
                {currentSlide.headline}
              </h1>
              {!hideSubheadline && currentSlide.subheadline?.trim() && (
                <p
                  style={{ textWrap: "balance" }}
                  className="mt-2.5 text-[13.5px] sm:text-[15.5px] leading-relaxed text-white/95 max-w-[560px] mx-auto font-normal"
                >
                  {currentSlide.subheadline}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Edge-to-Edge Crossfade + Subtle Zoom Motion Stage */}
        <div className="relative z-0 -mt-2 sm:-mt-4 w-full h-[260px] sm:h-[360px] lg:h-[440px]">
          {activeSlides.map((slide, idx) => {
            const isCurrent = idx === safeIndex;
            return (
              <motion.img
                key={slide.id}
                src={slide.image}
                alt={slide.headline}
                referrerPolicy="no-referrer"
                aria-hidden={!isCurrent}
                initial={false}
                animate={{
                  opacity: isCurrent ? 1 : 0,
                  scale: isCurrent ? 1 : 1.045,
                }}
                transition={{
                  opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: Math.max(2, speedMs / 1000), ease: "easeOut" },
                }}
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 26%, black 80%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, black 26%, black 80%, transparent 100%)",
                }}
                className={`absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none ${
                  isCurrent ? "z-10" : "z-0"
                }`}
              />
            );
          })}

          {activeSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/85 hover:bg-white text-[#14171A] border border-white/70 shadow-sm backdrop-blur-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
              >
                <LeftOutlined className="text-xs" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/85 hover:bg-white text-[#14171A] border border-white/70 shadow-sm backdrop-blur-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
              >
                <RightOutlined className="text-xs" />
              </button>

              <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                <div
                  role="tablist"
                  aria-label={`${ariaLabel} slide selector`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-white/80 shadow-xs"
                >
                  {activeSlides.map((slide, idx) => {
                    const isActive = idx === safeIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Slide ${idx + 1}: ${slide.headline}`}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          isActive
                            ? "w-7 bg-[#14171A]"
                            : "w-2 bg-[#14171A]/25 hover:bg-[#14171A]/50"
                        }`}
                      />
                    );
                  })}
                </div>

                {!isPaused && (
                  <div className="w-24 h-0.5 rounded-full bg-slate-900/10 overflow-hidden">
                    <motion.div
                      key={`${safeIndex}-${speedMs}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: speedMs / 1000, ease: "linear" }}
                      style={{ transformOrigin: "left" }}
                      className="h-full w-full bg-[#3393B8]"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}
