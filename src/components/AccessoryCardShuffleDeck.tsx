import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FiLayers, FiRotateCw } from "react-icons/fi";
import {
  buildAccessoryShuffleDeckOrder,
  type ProductAccessoryGroup,
} from "../utils/productCatalogHelpers";

interface AccessoryCardShuffleDeckProps {
  accessories: ProductAccessoryGroup[];
  mode?: "compact" | "stage";
  activeIndex?: number;
  onSelectIndex?: (nextIndex: number) => void;
  shuffleIntervalMs?: number;
  activeVariantImage?: string;
  activeVariantTitle?: string;
  activeVariantCode?: string;
}

const COMPACT_TRANSITION = {
  duration: 0.44,
  ease: [0.22, 1, 0.36, 1] as const,
};

const STAGE_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function AccessoryCardShuffleDeck({
  accessories,
  mode = "compact",
  activeIndex: controlledIndex,
  onSelectIndex,
  shuffleIntervalMs = 2800,
  activeVariantImage,
  activeVariantTitle,
  activeVariantCode,
}: AccessoryCardShuffleDeckProps) {
  const safeAccessories = useMemo(
    () => (Array.isArray(accessories) ? accessories.filter(Boolean) : []),
    [accessories]
  );

  const [internalIndex, setInternalIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = safeAccessories.length;
  const activeIdx =
    total === 0
      ? 0
      : typeof controlledIndex === "number"
      ? ((controlledIndex % total) + total) % total
      : ((internalIndex % total) + total) % total;

  const advanceNext = useCallback(() => {
    if (total <= 1) return;
    const next = (activeIdx + 1) % total;
    if (onSelectIndex) {
      onSelectIndex(next);
    } else {
      setInternalIndex(next);
    }
  }, [activeIdx, onSelectIndex, total]);

  // Auto-shuffle timer when uncontrolled (used inside product cards)
  useEffect(() => {
    if (typeof controlledIndex === "number") return;
    if (total <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setInternalIndex((prev) => (prev + 1) % total);
    }, Math.max(1600, shuffleIntervalMs));

    return () => window.clearInterval(timer);
  }, [controlledIndex, isPaused, shuffleIntervalMs, total]);

  const deckEntries = useMemo(
    () => buildAccessoryShuffleDeckOrder(safeAccessories, activeIdx, 3),
    [safeAccessories, activeIdx]
  );

  if (total === 0) {
    return null;
  }

  if (mode === "stage") {
    const reversedEntries = [...deckEntries].reverse();
    return (
      <MotionConfig reducedMotion="user">
        <div
          data-accessory-shuffle-deck="stage"
          className="relative w-full pb-4 pr-2 sm:pr-3 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative aspect-[4/3] w-full">
            <AnimatePresence initial={false}>
              {reversedEntries.map(({ item: acc, originalIndex, slotIndex }) => {
                const isFront = slotIndex === 0;
                const displayImg =
                  isFront && activeVariantImage ? activeVariantImage : acc.image;
                const displayTitle =
                  isFront && activeVariantTitle ? activeVariantTitle : acc.name;
                const displayCode = isFront ? activeVariantCode : undefined;
                const tilt = slotIndex === 0 ? 0 : slotIndex === 1 ? 2.2 : -2.2;
                const offsetX = slotIndex * 8;
                const offsetY = slotIndex * 8;
                const scale = 1 - slotIndex * 0.04;

                return (
                  <motion.div
                    key={acc.id || originalIndex}
                    style={{
                      zIndex: deckEntries.length - slotIndex,
                      transformOrigin: "50% 80%",
                    }}
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      x: -24,
                      y: 18,
                      rotate: -5,
                    }}
                    animate={{
                      opacity: 1 - slotIndex * 0.14,
                      scale,
                      x: offsetX,
                      y: offsetY,
                      rotate: tilt,
                    }}
                    exit={{
                      opacity: 0,
                      x: 110,
                      y: -26,
                      rotate: 11,
                      scale: 0.92,
                      zIndex: deckEntries.length + 2,
                    }}
                    transition={STAGE_TRANSITION}
                    aria-hidden={!isFront}
                    className={`absolute inset-0 rounded-xl overflow-hidden border bg-white shadow-[0_14px_34px_-16px_rgba(34,87,122,0.34)] ${
                      isFront ? "border-[#3393B8]/55" : "border-slate-200/95 pointer-events-none"
                    }`}
                  >
                    {isFront ? (
                      <button
                        type="button"
                        onClick={advanceNext}
                        aria-label={
                          total > 1
                            ? `Shuffle to next accessory (currently ${acc.name})`
                            : acc.name
                        }
                        className="relative w-full h-full block p-0 border-0 bg-slate-100 text-left cursor-pointer group"
                      >
                        <img
                          src={displayImg}
                          alt={displayTitle}
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className="w-full h-full object-cover block"
                        />

                        {(acc.brandLogo || acc.brandName) && (
                          <div
                            data-accessory-brand-badge="true"
                            className="absolute top-3 left-3 max-w-[68%] bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200/90 shadow-sm flex items-center gap-2"
                          >
                            {acc.brandLogo ? (
                              <img
                                src={acc.brandLogo}
                                alt={acc.brandName || `${acc.name} brand`}
                                referrerPolicy="no-referrer"
                                className="h-5 w-auto max-w-[125px] object-contain block"
                              />
                            ) : (
                              <span className="text-[11px] font-bold tracking-wide text-[#22577A]">
                                {acc.brandName}
                              </span>
                            )}
                          </div>
                        )}

                        {total > 1 && (
                          <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-950/65 text-white text-[10px] font-semibold inline-flex items-center gap-1 backdrop-blur-xs">
                            <FiRotateCw className="text-[10px]" />
                            <span>
                              {String(activeIdx + 1).padStart(2, "0")}/
                              {String(total).padStart(2, "0")}
                            </span>
                          </span>
                        )}

                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent pointer-events-none"
                        />

                        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2 text-white">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5CB6D2]">
                              {acc.name}
                            </div>
                            <div className="text-sm font-bold leading-snug">
                              {displayTitle}
                            </div>
                          </div>
                          {displayCode && (
                            <span className="px-2.5 py-0.5 rounded bg-[#22577A]/95 border border-white/25 text-[10px] font-bold tracking-wide shrink-0">
                              {displayCode}
                            </span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="relative w-full h-full bg-slate-100">
                        <img
                          src={displayImg}
                          alt=""
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className="w-full h-full object-cover block"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </MotionConfig>
    );
  }

  // Compact mode for ProductSystemCard
  const reversedCompact = [...deckEntries].reverse();

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-accessory-shuffle-deck="compact"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="w-full pt-1 pb-2"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#22577A]">
            <FiLayers className="text-[11px] text-[#3393B8]" />
            <span>
              Accessories ({total})
            </span>
          </span>

          {total > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                advanceNext();
              }}
              aria-label={`Shuffle accessory cards (${activeIdx + 1} of ${total})`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-sky-50 border border-slate-200 hover:border-[#3393B8] text-[10px] font-semibold text-slate-600 hover:text-[#22577A] cursor-pointer transition-colors tabular-nums"
            >
              <FiRotateCw className="text-[9px]" />
              <span>
                {activeIdx + 1}/{total}
              </span>
            </button>
          )}
        </div>

        {/* Stacked Physical Shuffle Deck */}
        <div className="relative h-[68px] w-full">
          <AnimatePresence initial={false}>
            {reversedCompact.map(({ item: acc, originalIndex, slotIndex }) => {
              const isFront = slotIndex === 0;
              const tilt = slotIndex === 0 ? 0 : slotIndex === 1 ? 1.8 : -1.8;
              const yOffset = slotIndex * 5;
              const scale = 1 - slotIndex * 0.045;
              const variantCount = (acc.variants || []).length;

              const cardInner = (
                <>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={acc.image}
                      alt={isFront ? acc.name : ""}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="w-9 h-9 rounded-md object-cover border border-slate-200 bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold text-[#14171A] leading-tight line-clamp-1">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-[#475569] leading-tight mt-0.5 line-clamp-1">
                        {variantCount > 0
                          ? `${variantCount} ${variantCount === 1 ? "variant" : "variants"}`
                          : acc.brandName || "Hardware Accessory"}
                      </div>
                    </div>
                  </div>

                  {(acc.brandLogo || acc.brandName) && (
                    <div
                      data-card-brand-logo="true"
                      className="shrink-0 bg-white border border-slate-200/90 rounded-md px-1.5 py-1 flex items-center justify-center max-w-[82px]"
                      title={acc.brandName || `${acc.name} brand`}
                    >
                      {acc.brandLogo ? (
                        <img
                          src={acc.brandLogo}
                          alt={isFront ? acc.brandName || `${acc.name} brand logo` : ""}
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className="h-4 w-auto max-w-[70px] object-contain block"
                        />
                      ) : (
                        <span className="text-[9.5px] font-bold text-[#22577A] whitespace-nowrap leading-none">
                          {acc.brandName}
                        </span>
                      )}
                    </div>
                  )}
                </>
              );

              return (
                <motion.div
                  key={acc.id || originalIndex}
                  aria-hidden={!isFront}
                  style={{
                    zIndex: deckEntries.length - slotIndex,
                    transformOrigin: "50% 85%",
                  }}
                  initial={{
                    opacity: 0,
                    scale: 0.88,
                    x: -14,
                    y: 12,
                    rotate: -3,
                  }}
                  animate={{
                    opacity: isFront ? 1 : 0.92 - slotIndex * 0.12,
                    scale,
                    x: 0,
                    y: yOffset,
                    rotate: tilt,
                  }}
                  exit={{
                    opacity: 0,
                    x: 52,
                    y: -12,
                    rotate: 9,
                    scale: 0.9,
                    zIndex: deckEntries.length + 2,
                  }}
                  transition={COMPACT_TRANSITION}
                  className={`absolute inset-x-0 top-0 h-[56px] rounded-lg border px-2.5 flex items-center gap-2.5 shadow-xs ${
                    isFront
                      ? "bg-[#F8FAFC] border-[#3393B8]/45 shadow-[0_6px_16px_-10px_rgba(34,87,122,0.35)]"
                      : "bg-white border-slate-200/95 pointer-events-none"
                  }`}
                >
                  {isFront ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        advanceNext();
                      }}
                      aria-label={
                        total > 1
                          ? `Shuffle accessory card: ${acc.name}`
                          : acc.name
                      }
                      className="w-full h-full flex items-center justify-between gap-2 bg-transparent border-0 p-0 text-left cursor-pointer"
                    >
                      {cardInner}
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-between gap-2">
                      {cardInner}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
