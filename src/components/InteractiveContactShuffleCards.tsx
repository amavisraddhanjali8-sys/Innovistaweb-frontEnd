import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCompass,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiPhoneCall,
} from "react-icons/fi";
import type { SiteContactSettings } from "../utils/footerConsultationHelpers";
import {
  buildContactDeckOrder,
  buildContactShuffleCards,
  getContactCardTheme,
  type ContactFormIntentId,
  type ContactShuffleCardItem,
} from "../utils/contactShowcaseHelpers";
import SilentRingingPhone from "./SilentRingingPhone";
import AnimatedSocialIcons from "./AnimatedSocialIcons";
import TactileActionButton from "./TactileActionButton";

export interface InteractiveContactShuffleCardsProps {
  settings: SiteContactSettings;
  onSelectIntent?: (intent: ContactFormIntentId) => void;
}

const DECK_SPRING_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
};

function CardWatermarkGraphic({ kind }: { kind: ContactShuffleCardItem["kind"] }) {
  if (kind === "hotline") {
    return (
      <FiPhoneCall className="w-28 h-28 sm:w-32 sm:h-32 -rotate-12 stroke-[1.5]" />
    );
  }
  if (kind === "sales") {
    return (
      <FiCompass className="w-28 h-28 sm:w-32 sm:h-32 rotate-12 stroke-[1.5]" />
    );
  }
  if (kind === "engineering") {
    return (
      <FiClock className="w-28 h-28 sm:w-32 sm:h-32 -rotate-12 stroke-[1.5]" />
    );
  }
  return (
    <FiMessageSquare className="w-28 h-28 sm:w-32 sm:h-32 rotate-6 stroke-[1.5]" />
  );
}

export default function InteractiveContactShuffleCards({
  settings,
  onSelectIntent,
}: InteractiveContactShuffleCardsProps) {
  const cards = useMemo(() => buildContactShuffleCards(settings), [settings]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const actionTimerRef = useRef<number | null>(null);

  const total = cards.length;
  const safeIndex = total > 0 ? ((activeIndex % total) + total) % total : 0;

  useEffect(() => {
    return () => {
      if (actionTimerRef.current) {
        window.clearTimeout(actionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPaused || total <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [isPaused, total]);

  const deckEntries = useMemo(
    () => buildContactDeckOrder(cards, safeIndex, 3),
    [cards, safeIndex]
  );

  const reversedEntries = useMemo(
    () => [...deckEntries].reverse(),
    [deckEntries]
  );

  const handlePrev = () => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handleCardAction = (card: ContactShuffleCardItem) => {
    if (!onSelectIntent) return;
    setLoadingCardId(card.id);
    onSelectIntent(card.linkedIntent);
    if (actionTimerRef.current) {
      window.clearTimeout(actionTimerRef.current);
    }
    actionTimerRef.current = window.setTimeout(() => {
      setLoadingCardId(null);
    }, 520);
  };

  const toneByKind: Record<
    ContactShuffleCardItem["kind"],
    "amber" | "azure" | "navy" | "pearl"
  > = {
    hotline: "amber",
    sales: "azure",
    engineering: "navy",
    social: "pearl",
  };

  const renderCardBody = (card: ContactShuffleCardItem, isFront: boolean) => {
    const theme = getContactCardTheme(card.kind);
    const buttonTone = toneByKind[card.kind] || "azure";
    const isActionLoading = loadingCardId === card.id;

    if (card.kind === "hotline") {
      return (
        <div className="space-y-3">
          <SilentRingingPhone
            phone={settings.phone}
            whatsapp={settings.whatsapp}
            label={card.title}
            variant="card"
          />

          {onSelectIntent && isFront && (
            <div className="pt-0.5 flex items-center justify-between gap-2">
              <TactileActionButton
                size="xs"
                tone={buttonTone}
                surface="dark"
                loading={isActionLoading}
                loadingText="Selecting..."
                icon={<FiArrowRight className="text-xs" />}
                onClick={() => handleCardAction(card)}
                ariaLabel={`Select ${card.title}`}
              >
                {theme.ctaLabel}
              </TactileActionButton>
            </div>
          )}
        </div>
      );
    }

    if (card.kind === "social") {
      return (
        <div className="space-y-3">
          <div>
            <h3
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-base sm:text-[17px] font-extrabold tracking-tight text-white m-0"
            >
              {card.title}
            </h3>
            <p className="mt-0.5 text-xs text-white/80 m-0 leading-snug">
              {card.detailSecondary}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <AnimatedSocialIcons
              settings={settings}
              size="sm"
              keyPrefix="shuffle-card-social"
            />
            {onSelectIntent && isFront && (
              <TactileActionButton
                size="xs"
                tone={buttonTone}
                surface="dark"
                loading={isActionLoading}
                loadingText="Opening..."
                icon={<FiArrowRight className="text-xs" />}
                onClick={() => handleCardAction(card)}
                ariaLabel={`Select ${card.title}`}
              >
                {theme.ctaLabel}
              </TactileActionButton>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div>
          <h3
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-base sm:text-[17px] font-extrabold tracking-tight text-white m-0"
          >
            {card.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <a
              href={`mailto:${card.detailPrimary}`}
              className="inline-flex items-center gap-1.5 text-white font-semibold no-underline hover:underline truncate max-w-full"
            >
              <FiMail className="shrink-0 text-white/85" />
              <span className="truncate">{card.detailPrimary}</span>
            </a>
            <div className="inline-flex items-center gap-1.5 text-white/85 truncate max-w-full">
              <FiMapPin className="shrink-0 text-white/80" />
              <span className="truncate">{card.detailSecondary}</span>
            </div>
          </div>
        </div>

        {onSelectIntent && isFront && (
          <div className="pt-0.5 flex items-center justify-between gap-2">
            <TactileActionButton
              size="xs"
              tone={buttonTone}
              surface="dark"
              loading={isActionLoading}
              loadingText="Selected"
              icon={<FiArrowRight className="text-xs" />}
              onClick={() => handleCardAction(card)}
              ariaLabel={`Select ${card.title}`}
            >
              {theme.ctaLabel}
            </TactileActionButton>
          </div>
        )}
      </div>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-testid="contact-shuffle-deck"
        data-active-card={cards[safeIndex]?.id || ""}
        data-active-index={safeIndex}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="w-full pt-1"
      >
        {/* Stacked Gradient Card Deck */}
        <div className="relative min-h-[200px] sm:min-h-[188px] w-full pb-6 pr-2">
          <AnimatePresence initial={false}>
            {reversedEntries.map(({ item: card, slotIndex }) => {
              const isFront = slotIndex === 0;
              const theme = getContactCardTheme(card.kind);
              const tilt = slotIndex === 0 ? 0 : slotIndex === 1 ? 1.4 : -1.4;
              const offsetX = slotIndex * 5;
              const offsetY = slotIndex * 8;
              const scale = 1 - slotIndex * 0.032;

              return (
                <motion.div
                  key={card.id}
                  style={{
                    zIndex: deckEntries.length - slotIndex,
                    transformOrigin: "50% 80%",
                    background: isFront ? theme.gradient : theme.backplateTint,
                    boxShadow: isFront
                      ? `0 18px 36px -14px ${theme.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.28)`
                      : "0 8px 18px -12px rgba(15,23,42,0.25)",
                  }}
                  initial={{
                    opacity: 0,
                    scale: 0.92,
                    x: -18,
                    y: 14,
                    rotate: -3,
                  }}
                  animate={{
                    opacity: isFront ? 1 : 0.72 - slotIndex * 0.16,
                    scale,
                    x: offsetX,
                    y: offsetY,
                    rotate: tilt,
                  }}
                  exit={{
                    opacity: 0,
                    x: 80,
                    y: -16,
                    rotate: 7,
                    scale: 0.93,
                    zIndex: deckEntries.length + 2,
                  }}
                  whileHover={isFront ? { y: -2 } : undefined}
                  transition={DECK_SPRING_TRANSITION}
                  aria-hidden={!isFront}
                  className={`group absolute inset-x-0 top-0 overflow-hidden rounded-[22px] border border-white/25 p-5 ${
                    isFront ? "" : "pointer-events-none"
                  }`}
                >
                  {/* Subtle Diagonal Glass Sheen Inspired by Uploaded Gradient Card Ref */}
                  <span
                    aria-hidden="true"
                    className="contact-card-sheen pointer-events-none absolute inset-0 opacity-90"
                  />

                  {/* Subtle Decorative Sparkles & Soft Right-Edge Watermark Icon */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-4 -bottom-4 text-white opacity-[0.16] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3"
                  >
                    <CardWatermarkGraphic kind={card.kind} />
                  </span>

                  {/* Card Header Row: Unboxed Editorial Kicker + Interactive Deck Controls */}
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
                    <span
                      style={{ color: theme.kickerColor }}
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    >
                      {card.kicker}
                    </span>

                    {isFront && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 mr-1">
                          {cards.map((c, idx) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setActiveIndex(idx)}
                              aria-label={`Show ${c.title}`}
                              className={`h-1.5 rounded-full border-0 p-0 cursor-pointer transition-all ${
                                idx === safeIndex
                                  ? "w-5 bg-white shadow-xs"
                                  : "w-1.5 bg-white/40 hover:bg-white/75"
                              }`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handlePrev}
                          aria-label="Previous contact card"
                          className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-white/15 hover:bg-white hover:text-[#0F172A] text-white border border-white/30 cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <FiChevronLeft className="text-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          aria-label="Next contact card"
                          className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-white/15 hover:bg-[#FB923C] hover:text-[#111827] hover:border-[#FED7AA] text-white border border-white/30 cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <FiChevronRight className="text-xs" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Main Content & Action */}
                  <div className="relative z-10">
                    {renderCardBody(card, isFront)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
