import { useEffect, useState, useCallback, useRef, type TouchEvent as ReactTouchEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiPause,
  FiPhoneCall,
  FiPlay,
  FiSliders,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import styles from "../cssModules/ImageSlider.module.css";
import CountUpComp from "./CountUpComp";
import ContactModal from "./ContactModal";
import TactileActionButton from "./TactileActionButton";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  normalizeHomeSlideshowCms,
  parseVideoEmbedUrl,
  type HomeSlideshowCmsPayload,
} from "../../../shared/homeSlideshowHelpers";
import { detectHorizontalSwipe } from "../utils/touchGestureHelpers";
import { buildHeroBackgroundCss } from "../../../shared/heroThemeHelpers";

export default function ImageSlider() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cms, setCms] = useState<HomeSlideshowCmsPayload>(
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const [current, setCurrent] = useState<number>(0);
  const [isPausedByHover, setIsPausedByHover] = useState<boolean>(false);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastActiveSlideIdRef = useRef<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ data?: Partial<HomeSlideshowCmsPayload> }>(
      "/api/home-slideshow"
    )
      .then((res) => {
        if (active && res.data?.data) {
          setCms(normalizeHomeSlideshowCms(res.data.data));
        }
      })
      .catch(() => {
        // Keep clean defaults on offline/fallback
      });
    return () => {
      active = false;
    };
  }, []);

  const activeSlides = cms.slides.filter((s) => s.active !== false);
  const visibleSlides = activeSlides.length > 0 ? activeSlides : cms.slides;
  const safeIndex =
    visibleSlides.length === 0 || current >= visibleSlides.length ? 0 : current;
  const currentSlide = visibleSlides[safeIndex] || DEFAULT_HOME_SLIDESHOW_CMS.slides[0];

  const goToSlide = useCallback((index: number) => {
    setCurrent(index);
    setIsVideoPaused(false);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrent((prev) =>
      visibleSlides.length <= 1 ? 0 : (prev + 1) % visibleSlides.length
    );
    setIsVideoPaused(false);
  }, [visibleSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) =>
      visibleSlides.length <= 1
        ? 0
        : prev === 0
        ? visibleSlides.length - 1
        : prev - 1
    );
    setIsVideoPaused(false);
  }, [visibleSlides.length]);

  useEffect(() => {
    if (
      visibleSlides.length <= 1 ||
      isPausedByHover ||
      isContactModalOpen ||
      isVideoPaused
    ) {
      return;
    }
    const timer = window.setTimeout(nextSlide, cms.slideshowSpeedMs);
    return () => window.clearTimeout(timer);
  }, [
    safeIndex,
    visibleSlides.length,
    isPausedByHover,
    isContactModalOpen,
    isVideoPaused,
    cms.slideshowSpeedMs,
    nextSlide,
  ]);

  // Sync HTML5 video play/pause cleanly to the active slide
  useEffect(() => {
    const activeId = visibleSlides[safeIndex]?.id ?? null;
    const slideChanged = lastActiveSlideIdRef.current !== activeId;
    lastActiveSlideIdRef.current = activeId;

    visibleSlides.forEach((slide, idx) => {
      const vid = videoRefs.current[slide.id];
      if (!vid) return;
      if (idx === safeIndex) {
        if (slideChanged) {
          try {
            vid.currentTime = 0;
          } catch {
            // Ignore if metadata not loaded yet
          }
        }
        if (!isVideoPaused) {
          vid.play().catch(() => {
            // Autoplay policy safe fallback
          });
        } else {
          vid.pause();
        }
      } else {
        vid.pause();
      }
    });
  }, [safeIndex, visibleSlides, isVideoPaused]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") prevSlide();
      else if (e.key === "ArrowRight") nextSlide();
    };

    globalThis.addEventListener("keydown", handleKeyPress);
    return () => globalThis.removeEventListener("keydown", handleKeyPress);
  }, [prevSlide, nextSlide]);

  const activeDirectVideo =
    currentSlide.mediaType === "video" &&
    !parseVideoEmbedUrl(currentSlide.mediaUrl);

  const toggleActiveVideoPlay = () => {
    const vid = videoRefs.current[currentSlide.id];
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsVideoPaused(false);
    } else {
      vid.pause();
      setIsVideoPaused(true);
    }
  };

  const handleTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch || visibleSlides.length <= 1) return;
    const dir = detectHorizontalSwipe(
      start.x,
      start.y,
      touch.clientX,
      touch.clientY,
      Date.now() - start.t
    );
    if (dir === "left") nextSlide();
    else if (dir === "right") prevSlide();
  };

  return (
    <section
      aria-label="Home Architectural Showcase Slideshow"
      aria-roledescription="carousel"
      className={styles.sliderContainer}
      onMouseEnter={() => setIsPausedByHover(true)}
      onMouseLeave={() => setIsPausedByHover(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Stage: Mixed Images, Uploaded MP4/WebM Videos, & Video Embeds */}
      <div className={styles.imageWrapper}>
        {visibleSlides.map((slide, index) => {
          const isCurrent = safeIndex === index;
          const embedUrl =
            slide.mediaType === "video"
              ? parseVideoEmbedUrl(slide.mediaUrl)
              : null;

          if (slide.mediaType === "video" && embedUrl) {
            return (
              <div
                key={slide.id}
                aria-hidden={!isCurrent}
                className={`${styles.sliderVideo} ${
                  isCurrent ? styles.active : ""
                } overflow-hidden`}
              >
                {isCurrent && (
                  <iframe
                    src={embedUrl}
                    title={slide.headline}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    className="w-full h-full border-0 scale-[1.12] pointer-events-none"
                  />
                )}
              </div>
            );
          }

          if (slide.mediaType === "video") {
            return (
              <video
                key={slide.id}
                ref={(el) => {
                  videoRefs.current[slide.id] = el;
                }}
                src={slide.mediaUrl}
                poster={slide.posterUrl}
                autoPlay={isCurrent}
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                aria-hidden={!isCurrent}
                className={`${styles.sliderVideo} ${
                  isCurrent ? styles.active : ""
                }`}
              />
            );
          }

          return (
            <img
              key={slide.id}
              src={slide.mediaUrl}
              alt={slide.headline || `Slide ${index + 1}`}
              referrerPolicy="no-referrer"
              aria-hidden={!isCurrent}
              className={`${styles.sliderImage} ${
                isCurrent ? styles.active : ""
              }`}
              loading={index === 0 ? "eager" : "lazy"}
            />
          );
        })}

        <div
          className={styles.mediaScrim}
          aria-hidden="true"
          style={
            cms.heroOverlayEnabled && cms.heroTheme
              ? {
                  background: buildHeroBackgroundCss(cms.heroTheme),
                  opacity: 0.64,
                }
              : undefined
          }
        />
      </div>

      {/* Admin Quick Manage Entry */}
      {user?.role === "admin" && (
        <Link
          to="/admin-home?tab=slideshow"
          className="absolute top-3.5 right-3.5 z-30 inline-flex items-center gap-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 px-3 py-1.5 text-xs font-semibold shadow-sm border border-white/80 no-underline transition-colors"
        >
          <FiSliders className="text-xs text-[#22577A]" />
          <span>Manage Slideshow ({visibleSlides.length})</span>
        </Link>
      )}

      {/* Center Hero Overlay Content (Stats + Headline + Description + Kept Buttons) */}
      <div className={styles.contentContainer}>
        {cms.showStats && cms.stats.length > 0 && (
          <div className={styles.statContainer}>
            {cms.stats.map((stat) => (
              <CountUpComp
                key={stat.id}
                number={stat.number}
                suffix={stat.suffix}
                title={stat.label}
                enableScrollTrigger={false}
              />
            ))}
          </div>
        )}

        <h1
          className={styles.mainHeading}
          style={
            cms.heroOverlayEnabled && cms.heroTheme
              ? { color: cms.heroTheme.headlineColor }
              : undefined
          }
        >
          {currentSlide.headline}
        </h1>
        <p
          className={styles.description}
          style={
            cms.heroOverlayEnabled && cms.heroTheme
              ? { color: cms.heroTheme.subheadlineColor }
              : undefined
          }
        >
          {currentSlide.description}
        </p>

        <div className={styles.buttonGroup}>
          <TactileActionButton
            tone="crimson"
            size="lg"
            surface="dark"
            icon={<FiPhoneCall className="text-sm" />}
            onClick={() => setIsContactModalOpen(true)}
          >
            {cms.primaryButtonLabel}
          </TactileActionButton>
          <TactileActionButton
            tone="azure"
            size="lg"
            surface="dark"
            trailingIcon={<FiArrowRight className="text-sm" />}
            onClick={() => navigate(cms.secondaryButtonPath || "/products")}
          >
            {cms.secondaryButtonLabel}
          </TactileActionButton>
        </div>
      </div>

      {/* Prev / Next Navigation Buttons */}
      {visibleSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className={`${styles.navButton} ${styles.navPrev}`}
          >
            <FiChevronLeft className="text-xl" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className={`${styles.navButton} ${styles.navNext}`}
          >
            <FiChevronRight className="text-xl" />
          </button>
        </>
      )}

      {/* Direct Video Playback Controls when a Video Slide is Active */}
      {activeDirectVideo && (
        <div className="flex items-center gap-1.5 absolute top-3.5 left-3.5 z-25 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/25 px-2.5 py-1 text-white">
          <button
            type="button"
            onClick={toggleActiveVideoPlay}
            aria-label={isVideoPaused ? "Play background video" : "Pause background video"}
            className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors"
          >
            {isVideoPaused ? <FiPlay className="text-xs" /> : <FiPause className="text-xs" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? "Unmute background video" : "Mute background video"}
            className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors"
          >
            {isMuted ? <FiVolumeX className="text-xs" /> : <FiVolume2 className="text-xs" />}
          </button>
        </div>
      )}

      {/* Slide Indicator Dots */}
      <div className={styles.controlsContainer}>
        <div className={styles.buttonContainer}>
          {visibleSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={styles.dotButton}
              aria-label={`Go to slide ${index + 1}: ${slide.headline}`}
            >
              <div className={styles.dotBackground} />
              {safeIndex === index && (
                <>
                  <div className={styles.dotActive} />
                  {!isPausedByHover && <div className={styles.dotProgress} />}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </section>
  );
}
