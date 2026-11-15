import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useAuth } from "../Context/AuthContext";
import {
  DEFAULT_HERO_SLIDES,
  DEFAULT_SLIDESHOW_SPEED_MS,
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  type HeroSlide,
} from "../utils/aboutContentHelpers";
import {
  DEFAULT_HERO_THEME,
  buildHeroBackgroundCss,
  buildHeroImageMaskCss,
  normalizeHeroTheme,
  type HeroThemeConfig,
} from "../utils/heroThemeHelpers";

interface AboutHeadProps {
  slides?: HeroSlide[];
  slideshowSpeedMs?: number;
  heroTheme?: HeroThemeConfig;
}

export default function AboutHead({
  slides,
  slideshowSpeedMs,
  heroTheme,
}: AboutHeadProps) {
  const { user } = useAuth();
  const activeSlides = slides && slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;
  const speedMs = clampSlideshowSpeedMs(slideshowSpeedMs ?? DEFAULT_SLIDESHOW_SPEED_MS);

  const theme = useMemo(
    () => normalizeHeroTheme(heroTheme, DEFAULT_HERO_THEME),
    [heroTheme]
  );
  const backgroundCss = useMemo(() => buildHeroBackgroundCss(theme), [theme]);
  const maskCss = useMemo(() => buildHeroImageMaskCss(theme), [theme]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeIndex = currentIndex >= activeSlides.length ? 0 : currentIndex;
  const currentSlide = activeSlides[safeIndex] || activeSlides[0];

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

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label="About Innovista Fabriconix Slideshow"
        aria-roledescription="carousel"
        data-speed-ms={speedMs}
        data-hero-mode={theme.mode}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        style={{ background: backgroundCss }}
        className="relative w-full overflow-hidden pt-9 sm:pt-12 pb-0 transition-[background] duration-300"
      >
        {/* Quick Admin Slideshow Manage Link when signed in as Admin */}
        {user?.role === "admin" && (
          <div className="absolute top-4 right-4 sm:right-8 z-30">
            <Link
              to="/EditVisionMission?tab=slideshow"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 hover:bg-white text-neutral-900 px-3.5 py-1.5 text-xs font-semibold shadow-sm border border-slate-200/80 transition-colors whitespace-nowrap"
            >
              Manage Slideshow ({(speedMs / 1000).toFixed(1)}s)
            </Link>
          </div>
        )}

        {/* Centered Dynamic Slide Headline & Subtitle with Modern Animated Transition */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center min-h-[125px] sm:min-h-[150px] flex flex-col justify-center">
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
                  color: theme.headlineColor,
                }}
                className="text-[36px] sm:text-[48px] lg:text-[54px] font-semibold tracking-tight leading-[1.12]"
              >
                {currentSlide.headline}
              </h1>
              <p
                style={{
                  textWrap: "balance",
                  color: theme.subheadlineColor,
                }}
                className="mt-3 text-[13.5px] sm:text-[15.5px] leading-relaxed max-w-[520px] mx-auto font-normal"
              >
                {currentSlide.subheadline}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Edge-to-Edge Crossfade + Subtle Zoom Motion Stage */}
        <div className="relative z-0 -mt-3 sm:-mt-5 w-full h-[270px] sm:h-[380px] lg:h-[460px]">
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
                  maskImage: maskCss === "none" ? undefined : maskCss,
                  WebkitMaskImage: maskCss === "none" ? undefined : maskCss,
                }}
                className={`absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none ${
                  isCurrent ? "z-10" : "z-0"
                }`}
              />
            );
          })}

          {/* Slide Prev / Next Arrows */}
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

              {/* Bottom Horizon Slide Indicators + Synchronized Autoplay Progress Track */}
              <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                <div
                  role="tablist"
                  aria-label="Choose About showcase slide"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-white/80 shadow-xs"
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
                      style={{
                        transformOrigin: "left",
                        backgroundColor: theme.accentColor,
                      }}
                      className="h-full w-full"
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

