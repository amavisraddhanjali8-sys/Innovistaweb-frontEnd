import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { MotionConfig, motion } from "framer-motion";
import { FiCheck, FiChevronLeft, FiChevronRight, FiMail } from "react-icons/fi";
import AboutTaglineHeading from "./AboutTaglineHeading";
import AccessoryCardShuffleDeck from "./AccessoryCardShuffleDeck";
import LogoLoop, { type LogoLoopItem } from "./LogoLoop";
import { detectHorizontalSwipe } from "../utils/touchGestureHelpers";
import {
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
} from "../utils/aboutContentHelpers";
import {
  DEFAULT_ACCESSORIES_RIBBON_SPEED,
  DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS,
  flattenAccessoryVariants,
  type FlattenedVariantSlideItem,
  type ProductAccessoryGroup,
} from "../utils/productCatalogHelpers";

interface ProductAccessoriesShowcaseProps {
  heading?: string;
  tagline?: string;
  accessories: ProductAccessoryGroup[];
  slideshowSpeedMs?: number;
  ribbonSpeed?: number;
  onQuoteWithVariant?: (variantLabel: string) => void;
}

type VariantRibbonLoopItem = LogoLoopItem & {
  flat: FlattenedVariantSlideItem;
};

export default function ProductAccessoriesShowcase({
  heading = "Hardware & Accessory Variants",
  tagline,
  accessories,
  slideshowSpeedMs = DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS,
  ribbonSpeed = DEFAULT_ACCESSORIES_RIBBON_SPEED,
  onQuoteWithVariant,
}: ProductAccessoriesShowcaseProps) {
  const safeAccessories = useMemo(() => accessories || [], [accessories]);
  const speedMs = clampSlideshowSpeedMs(
    slideshowSpeedMs ?? DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS,
    DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS
  );
  const safeRibbonSpeed = clampRibbonSpeed(
    ribbonSpeed ?? DEFAULT_ACCESSORIES_RIBBON_SPEED,
    DEFAULT_ACCESSORIES_RIBBON_SPEED
  );

  const [activeAccIdx, setActiveAccIdx] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const stageTouchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const safeAccIdx =
    safeAccessories.length === 0 || activeAccIdx >= safeAccessories.length
      ? 0
      : activeAccIdx;
  const activeAccessory = safeAccessories[safeAccIdx];

  const variants = activeAccessory?.variants || [];
  const safeVarIdx =
    variants.length === 0 || selectedVariantIdx >= variants.length
      ? 0
      : selectedVariantIdx;
  const activeVariant = variants[safeVarIdx] || null;

  useEffect(() => {
    setSelectedVariantIdx(0);
  }, [safeAccIdx]);

  useEffect(() => {
    if (safeAccessories.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveAccIdx((prev) => getNextSlideIndex(prev, safeAccessories.length));
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [safeAccessories.length, isPaused, speedMs]);

  const handlePrevAcc = useCallback(() => {
    setActiveAccIdx((prev) => getPrevSlideIndex(prev, safeAccessories.length));
  }, [safeAccessories.length]);

  const handleNextAcc = useCallback(() => {
    setActiveAccIdx((prev) => getNextSlideIndex(prev, safeAccessories.length));
  }, [safeAccessories.length]);

  const flatVariants = useMemo(
    () => flattenAccessoryVariants(safeAccessories),
    [safeAccessories]
  );

  const ribbonItems: VariantRibbonLoopItem[] = useMemo(
    () =>
      flatVariants.map((flat) => ({
        src: flat.variant.image,
        alt: flat.variant.name,
        flat,
      })),
    [flatVariants]
  );

  if (safeAccessories.length === 0 || !activeAccessory) {
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="product-accessories"
        aria-label={heading}
        data-accessories-speed={speedMs}
        data-ribbon-speed={safeRibbonSpeed}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="w-full bg-slate-50/75 border-y border-slate-100 py-12 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <AboutTaglineHeading
            kicker="Modular System Hardware"
            heading={heading}
            tagline={
              tagline ||
              "Explore compatible architectural handles, rollers, hinges, and custom hardware finishes configured for this system."
            }
          />

          {/* 1. Interactive Auto-Advancing Accessories Slideshow */}
          <div className="rounded-2xl bg-white border border-slate-200/85 shadow-[0_18px_46px_-26px_rgba(34,87,122,0.22)] overflow-hidden">
            {/* Top Accessory Group Selector Tabs */}
            <div className="px-4 sm:px-6 py-3 bg-[#F8FAFC] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div
                role="tablist"
                aria-label="Product accessory groups"
                className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0"
              >
                {safeAccessories.map((acc, idx) => {
                  const isCurrent = idx === safeAccIdx;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      onClick={() => setActiveAccIdx(idx)}
                      className={`min-h-[40px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                        isCurrent
                          ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8] hover:text-[#22577A]"
                      }`}
                    >
                      {acc.name}
                      {acc.variants.length > 0 && (
                        <span
                          className={`ml-1.5 text-[10px] tabular-nums ${
                            isCurrent ? "text-sky-100" : "text-slate-400"
                          }`}
                        >
                          ({acc.variants.length})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {safeAccessories.length > 1 && (
                <div className="flex items-center justify-end gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 tabular-nums mr-1">
                    0{safeAccIdx + 1} / 0{safeAccessories.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Previous accessory group"
                    onClick={handlePrevAcc}
                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-slate-600 hover:text-[#22577A] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <FiChevronLeft className="text-sm" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next accessory group"
                    onClick={handleNextAcc}
                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-slate-600 hover:text-[#22577A] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <FiChevronRight className="text-sm" />
                  </button>
                </div>
              )}
            </div>

            {/* Active Accessory Card Shuffle Stage + Multiple Variants Selector */}
            <div
              onTouchStart={(e: ReactTouchEvent<HTMLDivElement>) => {
                const t = e.changedTouches[0];
                if (t) stageTouchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
              }}
              onTouchEnd={(e: ReactTouchEvent<HTMLDivElement>) => {
                const start = stageTouchRef.current;
                stageTouchRef.current = null;
                const t = e.changedTouches[0];
                if (!start || !t || safeAccessories.length <= 1) return;
                const dir = detectHorizontalSwipe(
                  start.x,
                  start.y,
                  t.clientX,
                  t.clientY,
                  Date.now() - start.t
                );
                if (dir === "left") handleNextAcc();
                else if (dir === "right") handlePrevAcc();
              }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-4 sm:p-8 items-center touch-pan-y"
            >
              {/* Featured Card-Shuffle Deck Stage */}
              <div className="lg:col-span-5">
                <AccessoryCardShuffleDeck
                  accessories={safeAccessories}
                  mode="stage"
                  activeIndex={safeAccIdx}
                  onSelectIndex={setActiveAccIdx}
                  activeVariantImage={activeVariant?.image}
                  activeVariantTitle={activeVariant?.name}
                  activeVariantCode={activeVariant?.code}
                />
              </div>

              {/* Variants List & Details */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#14171A] tracking-tight m-0">
                      {activeAccessory.name}
                    </h3>
                    {(activeAccessory.brandLogo || activeAccessory.brandName) && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC]">
                        {activeAccessory.brandLogo ? (
                          <img
                            src={activeAccessory.brandLogo}
                            alt={activeAccessory.brandName || `${activeAccessory.name} brand`}
                            referrerPolicy="no-referrer"
                            className="h-5 w-auto max-w-[130px] object-contain block"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[#22577A]">
                            {activeAccessory.brandName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {activeAccessory.subtitle && (
                    <p className="mt-1.5 text-sm text-[#475569] leading-relaxed m-0">
                      {activeAccessory.subtitle}
                    </p>
                  )}
                </div>

                {variants.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#22577A]">
                      <span>Available Variants ({variants.length})</span>
                      {activeVariant?.finish && (
                        <span className="text-[#3393B8] normal-case font-semibold">
                          Selected Finish: {activeVariant.finish}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {variants.map((variant, vIdx) => {
                        const isSelected = vIdx === safeVarIdx;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantIdx(vIdx)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-sky-50/75 border-[#3393B8] ring-1 ring-[#3393B8]/25 shadow-2xs"
                                : "bg-[#F8FAFC] border-slate-200/80 hover:border-[#3393B8]/70 hover:bg-white"
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                              <img
                                src={variant.image || activeAccessory.image}
                                alt={variant.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover block"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-slate-900 line-clamp-1">
                                  {variant.name}
                                </span>
                                {isSelected && (
                                  <span className="w-4 h-4 rounded-full bg-[#22577A] text-white flex items-center justify-center shrink-0 text-[10px]">
                                    <FiCheck />
                                  </span>
                                )}
                              </div>
                              {(variant.finish || variant.code) && (
                                <div className="text-[11px] font-medium text-[#22577A] line-clamp-1 mt-0.5">
                                  {[variant.code, variant.finish].filter(Boolean).join(" · ")}
                                </div>
                              )}
                              {variant.spec && (
                                <div className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">
                                  {variant.spec}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {onQuoteWithVariant && (
                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onQuoteWithVariant(
                          activeVariant
                            ? `${activeAccessory.name} — ${activeVariant.name}${
                                activeVariant.code ? ` (${activeVariant.code})` : ""
                              }`
                            : activeAccessory.name
                        )
                      }
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <FiMail />
                      <span>
                        Inquire with {activeVariant ? activeVariant.name : activeAccessory.name}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Advance Progress Indicator */}
            {!isPaused && safeAccessories.length > 1 && (
              <div className="w-full h-1 bg-slate-100 overflow-hidden">
                <motion.div
                  key={`${safeAccIdx}-${speedMs}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: speedMs / 1000, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                  className="h-full w-full bg-[#3393B8]"
                />
              </div>
            )}
          </div>

          {/* 2. Automatically Sliding Hardware Variants Ribbon */}
          {ribbonItems.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#22577A] px-1">
                <span>Configured Accessory Variants</span>
                <span className="text-[#3393B8] normal-case font-medium">
                  Click any variant to inspect above
                </span>
              </div>

              <div
                data-accessories-ribbon="true"
                data-ribbon-speed={safeRibbonSpeed}
                className="w-full"
              >
                <LogoLoop
                  logos={ribbonItems}
                  speed={safeRibbonSpeed}
                  direction="left"
                  logoHeight={92}
                  gap={18}
                  pauseOnHover
                  fadeOut
                  fadeOutColor="#f8fafc"
                  ariaLabel="Auto-sliding product accessory variants ribbon"
                  renderItem={(item) => {
                    const typed = item as VariantRibbonLoopItem;
                    const { variant, accessory, accessoryIndex, variantIndex } = typed.flat;
                    const isFocused =
                      accessoryIndex === safeAccIdx && variantIndex === safeVarIdx;
                    return (
                      <button
                        type="button"
                        aria-label={`Inspect ${variant.name}`}
                        title={variant.name}
                        onClick={() => {
                          setActiveAccIdx(accessoryIndex);
                          setSelectedVariantIdx(variantIndex);
                        }}
                        className={`block p-0 bg-transparent border-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                          isFocused
                            ? "opacity-100 scale-[1.04]"
                            : "opacity-85 hover:opacity-100 hover:scale-[1.03]"
                        }`}
                      >
                        <img
                          src={variant.image || accessory.image}
                          alt={variant.name}
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className="h-[88px] w-[132px] object-cover rounded-xl block"
                        />
                      </button>
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}
