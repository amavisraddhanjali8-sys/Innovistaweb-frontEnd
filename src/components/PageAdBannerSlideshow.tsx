import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import {
  DEFAULT_PAGE_ADS_CMS,
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  getVisibleAdsForPage,
  normalizeSinglePageAdsConfig,
  type AdPageKey,
  type PageAdsConfig,
} from "../utils/pageAdsHelpers";

interface PageAdBannerSlideshowProps {
  pageKey: AdPageKey;
  variant?: "popup" | "inline";
  overrideConfig?: PageAdsConfig;
  className?: string;
  onDismiss?: () => void;
  resetSignal?: number;
}

export default function PageAdBannerSlideshow({
  pageKey,
  variant = "popup",
  overrideConfig,
  className = "",
  onDismiss,
  resetSignal = 0,
}: PageAdBannerSlideshowProps) {
  const navigate = useNavigate();

  const [fetchedConfig, setFetchedConfig] = useState<PageAdsConfig | null>(() =>
    overrideConfig ? overrideConfig : null
  );
  const [hasLoaded, setHasLoaded] = useState<boolean>(() =>
    Boolean(overrideConfig)
  );
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset dismissal when parent changes pageKey or explicitly triggers resetSignal
  useEffect(() => {
    setDismissed(false);
    setActiveIndex(0);
  }, [pageKey, resetSignal]);

  useEffect(() => {
    if (overrideConfig) {
      setHasLoaded(true);
      return;
    }
    let active = true;
    setHasLoaded(false);
    const loadAds = async () => {
      try {
        const res = await AxiosConfig.get("/ads/cms", {
          params: { pageKey },
        });
        if (!active) return;
        const rawPage = res.data?.page || res.data?.pages?.[pageKey];
        if (rawPage) {
          setFetchedConfig(normalizeSinglePageAdsConfig(rawPage, pageKey));
        } else {
          setFetchedConfig(DEFAULT_PAGE_ADS_CMS.pages[pageKey]);
        }
      } catch {
        if (active) {
          setFetchedConfig(DEFAULT_PAGE_ADS_CMS.pages[pageKey]);
        }
      } finally {
        if (active) {
          setHasLoaded(true);
        }
      }
    };
    loadAds();
    return () => {
      active = false;
    };
  }, [pageKey, overrideConfig]);

  const activeConfig = overrideConfig || fetchedConfig;
  const ads = getVisibleAdsForPage(activeConfig);
  const speedMs = clampSlideshowSpeedMs(activeConfig?.slideshowSpeedMs ?? 4000);
  const safeIndex = ads.length === 0 || activeIndex >= ads.length ? 0 : activeIndex;
  const currentAd = ads[safeIndex];

  const firstAdId = ads[0]?.id;
  useEffect(() => {
    setActiveIndex(0);
  }, [ads.length, firstAdId]);

  const handleClose = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleNext = useCallback(() => {
    if (ads.length <= 1) return;
    setActiveIndex((prev) => getNextSlideIndex(prev, ads.length));
  }, [ads.length]);

  const handlePrev = useCallback(() => {
    if (ads.length <= 1) return;
    setActiveIndex((prev) => getPrevSlideIndex(prev, ads.length));
  }, [ads.length]);

  // Close popup on Escape key
  useEffect(() => {
    if (variant !== "popup" || !hasLoaded || dismissed || !currentAd) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant, hasLoaded, dismissed, currentAd, handleClose]);

  useEffect(() => {
    if (!hasLoaded || dismissed || ads.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => getNextSlideIndex(prev, ads.length));
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [hasLoaded, dismissed, ads.length, isPaused, speedMs]);

  // Hide cleanly when no active unpaused ads exist, disabled, loading, or dismissed
  if (!hasLoaded || dismissed || !activeConfig || !currentAd) {
    return null;
  }

  const navigateTarget = (rawUrl?: string) => {
    const link = rawUrl?.trim();
    if (!link) return;
    if (link.startsWith("#/")) {
      setDismissed(true);
      navigate(link.slice(1));
      return;
    }
    if (link.startsWith("/")) {
      setDismissed(true);
      navigate(link);
      return;
    }
    if (/^https?:\/\//i.test(link)) {
      window.location.assign(link);
    }
  };

  const buttons = Array.isArray(currentAd.buttons) ? currentAd.buttons : [];
  const hasOverlayFooter = buttons.length > 0 || ads.length > 1;

  // Image-only advertisement frame with overlay action buttons & close icon
  const adCard = (
    <div
      aria-label={`${activeConfig.label} Promotion Advertisement`}
      aria-roledescription={ads.length > 1 ? "carousel" : undefined}
      data-ad-page={pageKey}
      data-ad-variant={variant}
      data-speed-ms={speedMs}
      data-ad-count={ads.length}
      data-active-index={safeIndex}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onClick={(e) => e.stopPropagation()}
      className={`relative inline-block w-fit max-w-[92vw] sm:max-w-[84vw] lg:max-w-[820px] rounded-2xl overflow-hidden bg-slate-900 shadow-[0_28px_70px_-18px_rgba(15,23,42,0.65)] group ${
        variant === "inline" ? className : ""
      }`}
    >
      <motion.div
        key={`${currentAd.id}-${safeIndex}`}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={
          currentAd.linkUrl
            ? () => navigateTarget(currentAd.linkUrl)
            : undefined
        }
        role={currentAd.linkUrl ? "link" : undefined}
        tabIndex={currentAd.linkUrl ? 0 : undefined}
        onKeyDown={(e) => {
          if (currentAd.linkUrl && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            navigateTarget(currentAd.linkUrl);
          }
        }}
        className={currentAd.linkUrl ? "cursor-pointer" : ""}
      >
        <img
          src={currentAd.image}
          alt={currentAd.title || "Promotion Advertisement"}
          referrerPolicy="no-referrer"
          className="block w-auto h-auto max-w-[92vw] sm:max-w-[84vw] lg:max-w-[820px] max-h-[82vh] object-contain mx-auto"
        />
      </motion.div>

      {/* Top-Right Close (X) Button */}
      <button
        type="button"
        aria-label="Close advertisement"
        title="Close advertisement"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
        className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white border border-white/30 shadow-lg flex items-center justify-center cursor-pointer transition-all"
      >
        <FiX className="text-lg" />
      </button>

      {/* Slideshow Previous / Next Buttons when Multiple Unpaused Ads Exist */}
      {ads.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous advertisement"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white border border-white/25 shadow-md flex items-center justify-center cursor-pointer transition-all"
          >
            <FiChevronLeft className="text-base" />
          </button>

          <button
            type="button"
            aria-label="Next advertisement"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white border border-white/25 shadow-md flex items-center justify-center cursor-pointer transition-all"
          >
            <FiChevronRight className="text-base" />
          </button>
        </>
      )}

      {/* Bottom Scrim Holding Only Slide Indicators & CTA Action Buttons */}
      {hasOverlayFooter && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-3.5 sm:px-5 pt-10 pb-3.5 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
          {ads.length > 1 ? (
            <div
              className="flex items-center gap-1.5 shrink-0 pointer-events-auto"
              role="tablist"
              aria-label="Advertisement slides"
            >
              {ads.map((ad, idx) => {
                const isCurrent = idx === safeIndex;
                return (
                  <button
                    key={ad.id}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    aria-label={`View advertisement ${idx + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer border-0 ${
                      isCurrent
                        ? "w-6 bg-white shadow-xs"
                        : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                );
              })}
            </div>
          ) : (
            <div />
          )}

          {buttons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 ml-auto pointer-events-auto">
              {buttons.map((btn, bIdx) => {
                const isExternal = /^https?:\/\//i.test(btn.url);
                const isPrimary = bIdx === 0;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigateTarget(btn.url);
                    }}
                    className={`min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                      isPrimary
                        ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-110 text-white border border-white/15 shadow-lg"
                        : "bg-white/95 hover:bg-white text-[#14171A] border border-white/80 shadow-md"
                    }`}
                  >
                    <span>{btn.label}</span>
                    {isExternal ? (
                      <FiExternalLink className="text-[11px]" />
                    ) : (
                      <FiArrowRight className="text-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "inline") {
    return (
      <MotionConfig reducedMotion="user">
        <div className="w-full flex justify-center">{adCard}</div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${activeConfig.label} Promotion Popup`}
        onClick={handleClose}
        className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70"
      >
        {adCard}
      </div>
    </MotionConfig>
  );
}
