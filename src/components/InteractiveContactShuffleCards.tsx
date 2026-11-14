import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FiCheckCircle, FiMail, FiMapPin } from "react-icons/fi";
import type { SiteContactSettings } from "../utils/footerConsultationHelpers";
import {
  buildContactDeckOrder,
  buildContactShuffleCards,
  type ContactFormIntentId,
  type ContactShuffleCardItem,
} from "../utils/contactShowcaseHelpers";
import SilentRingingPhone from "./SilentRingingPhone";
import AnimatedSocialIcons from "./AnimatedSocialIcons";

export interface InteractiveContactShuffleCardsProps {
  settings: SiteContactSettings;
  onSelectIntent?: (intent: ContactFormIntentId) => void;
}

const DECK_SPRING_TRANSITION = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function InteractiveContactShuffleCards({
  settings,
  onSelectIntent,
}: InteractiveContactShuffleCardsProps) {
  const cards = useMemo(() => buildContactShuffleCards(settings), [settings]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = cards.length;
  const safeIndex = total > 0 ? ((activeIndex % total) + total) % total : 0;

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
    }, 3600);

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

  const renderCardBody = (card: ContactShuffleCardItem, isFront: boolean) => {
    if (card.kind === "hotline") {
      return (
        <div className="space-y-2">
          <SilentRingingPhone
            phone={settings.phone}
            whatsapp={settings.whatsapp}
            label={card.title}
            variant="card"
          />
          {onSelectIntent && isFront && (
            <button
              type="button"
              onClick={() => onSelectIntent(card.linkedIntent)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#22577A] hover:text-[#EA580C] bg-transparent border-0 p-0 cursor-pointer transition-colors"
            >
              <FiCheckCircle className="text-xs" />
              <span>Callback →</span>
            </button>
          )}
        </div>
      );
    }

    if (card.kind === "social") {
      return (
        <div className="space-y-3">
          <div className="text-sm font-bold text-[#14171A]">{card.title}</div>
          <AnimatedSocialIcons
            settings={settings}
            size="sm"
            keyPrefix="shuffle-card-social"
          />
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        <div className="text-sm font-bold text-[#14171A]">{card.title}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <a
            href={`mailto:${card.detailPrimary}`}
            className="inline-flex items-center gap-1.5 text-[#22577A] font-semibold no-underline hover:underline truncate"
          >
            <FiMail className="shrink-0 text-[#3393B8]" />
            <span className="truncate">{card.detailPrimary}</span>
          </a>
          <div className="inline-flex items-center gap-1.5 text-[#5F6672] truncate">
            <FiMapPin className="shrink-0 text-[#EA580C]" />
            <span className="truncate">{card.detailSecondary}</span>
          </div>
        </div>

        {onSelectIntent && isFront && (
          <button
            type="button"
            onClick={() => onSelectIntent(card.linkedIntent)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#22577A] hover:text-[#EA580C] bg-transparent border-0 p-0 cursor-pointer transition-colors"
          >
            <FiCheckCircle className="text-xs" />
            <span>Select {card.title} →</span>
          </button>
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
        className="w-full pt-1"
      >
        {/* Stacked Physical Shuffle Deck */}
        <div className="relative min-h-[154px] sm:min-h-[148px] w-full pb-4 pr-2">
          <AnimatePresence initial={false}>
            {reversedEntries.map(({ item: card, slotIndex }) => {
              const isFront = slotIndex === 0;
              const tilt = slotIndex === 0 ? 0 : slotIndex === 1 ? 1.6 : -1.6;
              const offsetX = slotIndex * 6;
              const offsetY = slotIndex * 7;
              const scale = 1 - slotIndex * 0.035;

              return (
                <motion.div
                  key={card.id}
                  style={{
                    zIndex: deckEntries.length - slotIndex,
                    transformOrigin: "50% 80%",
                  }}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    x: -20,
                    y: 16,
                    rotate: -4,
                  }}
                  animate={{
                    opacity: isFront ? 1 : 0.9 - slotIndex * 0.14,
                    scale,
                    x: offsetX,
                    y: offsetY,
                    rotate: tilt,
                  }}
                  exit={{
                    opacity: 0,
                    x: 90,
                    y: -20,
                    rotate: 9,
                    scale: 0.92,
                    zIndex: deckEntries.length + 2,
                  }}
                  transition={DECK_SPRING_TRANSITION}
                  aria-hidden={!isFront}
                  className={`absolute inset-x-0 top-0 rounded-2xl border p-4 transition-shadow ${
                    isFront
                      ? "bg-white border-[#3393B8]/45 shadow-[0_14px_32px_-16px_rgba(34,87,122,0.28)]"
                      : "bg-slate-50 border-slate-200 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA580C]">
                      {card.kicker}
                    </span>
                    {isFront && (
                      <div className="flex items-center gap-1">
                        {cards.map((c, idx) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            aria-label={`Show ${c.title}`}
                            className={`h-1.5 rounded-full border-0 p-0 cursor-pointer transition-all ${
                              idx === safeIndex
                                ? "w-4 bg-[#22577A]"
                                : "w-1.5 bg-slate-300 hover:bg-slate-400"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {renderCardBody(card, isFront)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
