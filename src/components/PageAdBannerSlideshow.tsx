import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiSliders,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
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
  const { user } = useAuth();

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

  // Hide cleanly when no ads exist, disabled, loading, or dismissed
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
  const hasFooterContent =
    Boolean(currentAd.title) || buttons.length > 0 || ads.length > 1;

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
      className={`relative inline-flex flex-col w-fit max-w-[92vw] sm:max-w-[84vw] rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xl group ${
        variant === "inline" ? className : ""
      }`}
    >
      {/* Natural Image-Sized Visual Container */}
      <div className="relative bg-slate-100 flex items-center justify-center">
        <motion.div
          key={`${currentAd.id}-${safeIndex}`}
          initial={{ opacity: 0.35 }}
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
            className="block w-auto h-auto max-w-[90vw] sm:max-w-[78vw] lg:max-w-[820px] max-h-[68vh] object-contain mx-auto"
          />
        </motion.div>

        {/* Subtle Top-Left Promotion Badge & Admin Quick Action */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-white/95 text-[#22577A] border border-slate-200 text-[10px] font-bold uppercase tracking-wider shadow-xs">
            Ad
          </span>
          {user?.role === "admin" && !overrideConfig && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDismissed(true);
                navigate(`/PageAdsAdmin?page=${encodeURIComponent(pageKey)}`);
              }}
              className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/95 hover:bg-white text-[#22577A] border border-slate-200 text-[11px] font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <FiSliders className="text-[11px]" />
              <span>Manage Ads</span>
            </button>
          )}
        </div>

        {/* Top-Right Corner Exit Icon */}
        <button
          type="button"
          aria-label="Close advertisement"
          title="Close advertisement"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-800 hover:text-[#e60000] border border-slate-200 shadow-md flex items-center justify-center cursor-pointer transition-colors"
        >
          <FiX className="text-base" />
        </button>

        {/* Slideshow Navigation Arrows when Multiple Ads Exist */}
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
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#22577A] border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer transition-opacity"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#22577A] border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer transition-opacity"
            >
              <FiChevronRight className="text-base" />
            </button>
          </>
        )}
      </div>

      {/* Promotion Title, Dots & Referral CTA Buttons */}
      {hasFooterContent && (
        <div className="w-full px-4 py-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            {currentAd.title && (
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[340px]">
                {currentAd.title}
              </div>
            )}

            {ads.length > 1 && (
              <div
                className="flex items-center gap-1.5 shrink-0"
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
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        isCurrent
                          ? "w-5 bg-[#22577A]"
                          : "w-2 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {buttons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
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
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                      isPrimary
                        ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-white text-[#22577A] border border-slate-200 hover:border-[#3393B8]"
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
        className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-[2px]"
      >
        {adCard}
      </div>
    </MotionConfig>
  );
}
