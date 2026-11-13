import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { LeftOutlined, RightOutlined, StarFilled } from "@ant-design/icons";
import AboutTaglineHeading from "./AboutTaglineHeading";
import LogoLoop, { type LogoLoopItem } from "./LogoLoop";
import {
  DEFAULT_CLIENTS_RIBBON_SPEED,
  DEFAULT_FEEDBACK_SPEED_MS,
  DEFAULT_JOURNEY_SPEED_MS,
  DEFAULT_PARTNERS_RIBBON_SPEED,
  buildSmoothRoadPath,
  clampLogoScale,
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  computeRoadmapPoints,
  getNextSlideIndex,
  getPrevSlideIndex,
  sanitizeAboutImage,
  type ClientFeedbackItem,
  type ClientItem,
  type DirectorMessageContent,
  type JourneyMilestoneItem,
  type PartnerItem,
  type TeamMemberItem,
} from "../utils/aboutContentHelpers";

function ImageWithFallback({
  src,
  alt,
  fallbackText,
  className = "",
}: {
  src: string;
  alt: string;
  fallbackText: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const safeSrc = sanitizeAboutImage(src, "");

  if (!safeSrc || failed) {
    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-[#22577A] to-[#3393B8] text-white font-semibold tracking-tight select-none ${className}`}
      >
        <span>{fallbackText.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Director's Message Section                                              */
/* -------------------------------------------------------------------------- */
export function DirectorMessageSection({
  data,
}: {
  data: DirectorMessageContent;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="directors-message"
        aria-label="Director's Message"
        className="w-full bg-slate-50/75 border-y border-slate-100 py-8 sm:py-11"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker={data.tagline || "Leadership Perspective"}
            heading={data.heading || "Director's Message"}
            tagline="Architectural accountability from concept drawings through precision fabrication."
            editTab="director"
            editLabel="Edit Director Message"
          />

          <motion.div
            initial={{ opacity: 0.85, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: "some" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-stretch rounded-[24px] bg-white border border-slate-200/80 p-5 sm:p-8 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.12)]"
          >
            {/* Editorial Portrait */}
            <div className="lg:col-span-5">
              <div className="w-full h-full min-h-[280px] max-h-[400px] rounded-2xl overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={data.image}
                  alt={data.directorName}
                  fallbackText={data.directorName}
                  className="w-full h-full object-cover object-top block transition-transform duration-500 hover:scale-[1.03]"
                />
              </div>
            </div>

            {/* Statement & Attribution */}
            <div className="lg:col-span-7 flex flex-col justify-between py-1">
              <div>
                <p
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", textWrap: "balance" }}
                  className="text-[20px] sm:text-[24px] lg:text-[26px] font-medium text-[#14171A] leading-[1.32] tracking-tight"
                >
                  &ldquo;{data.quote}&rdquo;
                </p>

                <p className="mt-4 text-[14.5px] sm:text-[15.5px] leading-[1.7] text-[#475569]">
                  {data.message}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-base font-bold text-[#14171A]">
                    {data.directorName}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    {data.directorTitle}
                  </div>
                </div>

                <div className="text-xs font-medium text-[#22577A] tracking-wide">
                  ISO 9001 Fabrication Standards
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Meet the Team Section (Animated Editorial Collage — Zero Descriptions)  */
/* -------------------------------------------------------------------------- */
function TeamCollageTile({
  member,
  index,
  activeHighlight,
  hoveredId,
  onHover,
  className = "",
}: {
  member: TeamMemberItem;
  index: number;
  activeHighlight: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  className?: string;
}) {
  const isHovered = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isHovered;

  return (
    <motion.article
      key={member.id}
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 22,
        delay: Math.min(index * 0.08, 0.35),
      }}
      whileHover={{ y: -4, scale: 1.012 }}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
      className={`group relative overflow-hidden rounded-[22px] bg-slate-900 transition-all duration-300 ${
        isDimmed ? "opacity-80" : "opacity-100"
      } ${
        isHovered || activeHighlight
          ? "ring-2 ring-[#3393B8]/80 shadow-[0_22px_45px_-18px_rgba(34,87,122,0.38)]"
          : "ring-1 ring-slate-200/80 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.2)]"
      } ${className}`}
    >
      <ImageWithFallback
        src={member.image}
        alt={`${member.name} — ${member.role}`}
        fallbackText={member.name}
        className="w-full h-full object-cover object-[50%_18%] block transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />

      {/* Subtle Bottom Scrim + Name & Role Only (Zero Descriptions) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none"
      />

      {/* Animated Accent Bar */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ scaleX: isHovered || activeHighlight ? 1 : 0.35, opacity: isHovered || activeHighlight ? 1 : 0.6 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "left" }}
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E60000] via-[#3393B8] to-[#5CB6D2]"
      />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-2">
        <div>
          <span className="block text-[11px] font-semibold tracking-wider uppercase text-sky-300">
            {member.role}
          </span>
          <h3
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="mt-0.5 text-base sm:text-lg font-semibold text-white tracking-tight leading-snug"
          >
            {member.name}
          </h3>
        </div>
      </div>
    </motion.article>
  );
}

export function MeetTheTeamSection({
  members,
}: {
  members: TeamMemberItem[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [spotlightIdx, setSpotlightIdx] = useState<number>(0);

  useEffect(() => {
    if (members.length <= 1 || hoveredId !== null) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setSpotlightIdx((prev) => getNextSlideIndex(prev, members.length));
    }, 3200);
    return () => window.clearInterval(timer);
  }, [members.length, hoveredId]);

  const safeSpotlight = spotlightIdx >= members.length ? 0 : spotlightIdx;
  const primaryHero = members[0];
  const secondaryPair = members.slice(1, 3);
  const extraStrip = members.slice(3);

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="meet-the-team"
        aria-label="Meet the Team"
        data-team-collage-count={members.length}
        className="w-full bg-white py-8 sm:py-11"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Our People"
            heading="Meet The Team"
            editTab="team"
            editLabel="Manage Team"
          />

          {members.length === 1 && primaryHero && (
            <div className="max-w-md mx-auto">
              <TeamCollageTile
                member={primaryHero}
                index={0}
                activeHighlight={safeSpotlight === 0}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                className="h-[340px] sm:h-[400px]"
              />
            </div>
          )}

          {members.length === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <TeamCollageTile
                member={members[0]}
                index={0}
                activeHighlight={safeSpotlight === 0}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                className="md:col-span-7 h-[300px] sm:h-[380px]"
              />
              <TeamCollageTile
                member={members[1]}
                index={1}
                activeHighlight={safeSpotlight === 1}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                className="md:col-span-5 h-[300px] sm:h-[380px]"
              />
            </div>
          )}

          {members.length >= 3 && primaryHero && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
                {/* Featured Large Left Portrait */}
                <TeamCollageTile
                  member={primaryHero}
                  index={0}
                  activeHighlight={safeSpotlight === 0}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                  className="md:col-span-5 h-[310px] sm:h-[410px]"
                />

                {/* Editorial Staggered Right Portraits */}
                <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
                  {secondaryPair.map((member, offset) => {
                    const globalIdx = offset + 1;
                    const heightClass =
                      secondaryPair.length === 1
                        ? "sm:col-span-2 h-[280px] sm:h-[410px]"
                        : offset === 0
                        ? "h-[270px] sm:h-[365px] sm:self-start"
                        : "h-[270px] sm:h-[385px] sm:self-end";
                    return (
                      <TeamCollageTile
                        key={member.id}
                        member={member}
                        index={globalIdx}
                        activeHighlight={safeSpotlight === globalIdx}
                        hoveredId={hoveredId}
                        onHover={setHoveredId}
                        className={heightClass}
                      />
                    );
                  })}
                </div>
              </div>

              {extraStrip.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {extraStrip.map((member, offset) => {
                    const globalIdx = offset + 3;
                    return (
                      <TeamCollageTile
                        key={member.id}
                        member={member}
                        index={globalIdx}
                        activeHighlight={safeSpotlight === globalIdx}
                        hoveredId={hoveredId}
                        onHover={setHoveredId}
                        className="h-[240px] sm:h-[260px]"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Our Journey Section (Auto-Running Architectural Roadmap Showcase)       */
/* -------------------------------------------------------------------------- */
export function OurJourneySection({
  milestones,
  journeySpeedMs = DEFAULT_JOURNEY_SPEED_MS,
}: {
  milestones: JourneyMilestoneItem[];
  journeySpeedMs?: number;
}) {
  const speedMs = clampSlideshowSpeedMs(journeySpeedMs, DEFAULT_JOURNEY_SPEED_MS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeIdx = activeIdx >= milestones.length ? 0 : activeIdx;
  const activeMilestone = milestones[safeIdx];

  useEffect(() => {
    if (milestones.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIdx((prev) => getNextSlideIndex(prev, milestones.length));
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [milestones.length, isPaused, speedMs]);

  const roadPoints = computeRoadmapPoints(milestones.length);
  const fullRoadPath = buildSmoothRoadPath(roadPoints);
  const progressPoints = roadPoints.slice(0, Math.max(1, safeIdx + 1));
  const activeRoadPath =
    progressPoints.length === 1 && roadPoints.length > 1
      ? `M ${roadPoints[0].x} ${roadPoints[0].y} L ${roadPoints[0].x} ${roadPoints[0].y}`
      : buildSmoothRoadPath(progressPoints);

  const activePoint = roadPoints[safeIdx] || { x: 500, y: 90 };

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="our-journey"
        aria-label="Our Journey Roadmap"
        data-journey-active={safeIdx}
        data-journey-speed={speedMs}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="w-full bg-slate-50/75 border-y border-slate-100 py-8 sm:py-11"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Heritage & Growth"
            heading="Our Journey"
            tagline="A decade of precision milestones charted along our fabrication roadmap."
            editTab="journey"
            editLabel="Edit Journey"
          />

          {/* Winding SVG Architectural Roadmap Canvas (Desktop & Tablet) */}
          {milestones.length > 0 && (
            <div className="hidden md:block relative rounded-[24px] bg-white border border-slate-200/80 px-6 py-5 shadow-[0_14px_40px_-24px_rgba(34,87,122,0.16)] mb-5">
              <div className="relative w-full aspect-[1000/185]">
                <svg
                  viewBox="0 0 1000 185"
                  fill="none"
                  aria-hidden="true"
                  className="w-full h-full overflow-visible block"
                >
                  <defs>
                    <linearGradient id="roadmapActiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3393B8" />
                      <stop offset="65%" stopColor="#22577A" />
                      <stop offset="100%" stopColor="#E60000" />
                    </linearGradient>
                  </defs>

                  {/* Highway Shoulder / Roadbed */}
                  <path
                    d={fullRoadPath}
                    stroke="#E2E8F0"
                    strokeWidth="22"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Asphalt Inner Track */}
                  <path
                    d={fullRoadPath}
                    stroke="#1E293B"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Subtle Dashed Highway Center Line */}
                  <path
                    d={fullRoadPath}
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    className="roadmap-dash-flow"
                  />

                  {/* Animated Active Route Illumination */}
                  <motion.path
                    key={activeRoadPath}
                    d={activeRoadPath}
                    stroke="url(#roadmapActiveGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0.72, opacity: 0.8 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  />

                  {/* Moving Beacon Ring on Active Station */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={18}
                    fill="rgba(51, 147, 184, 0.16)"
                    className="roadmap-beacon-pulse"
                    style={{ transformOrigin: `${activePoint.x}px ${activePoint.y}px` }}
                  />
                </svg>

                {/* Interactive Station Pins & Labels Positioned Exact to SVG Coordinates */}
                {milestones.map((item, idx) => {
                  const pt = roadPoints[idx] || { x: 500, y: 90 };
                  const isActive = idx === safeIdx;
                  const isPassed = idx < safeIdx;
                  const placeAbove = pt.y > 90;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      aria-pressed={isActive}
                      aria-label={`${item.year}: ${item.title}`}
                      style={{
                        left: `${(pt.x / 1000) * 100}%`,
                        top: `${(pt.y / 185) * 100}%`,
                      }}
                      className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none cursor-pointer"
                    >
                      {/* Station Pin Node */}
                      <span
                        className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-xs tabular-nums transition-all duration-300 ${
                          isActive
                            ? "bg-[#E60000] text-white border-white scale-115 shadow-md"
                            : isPassed
                            ? "bg-[#22577A] text-white border-white"
                            : "bg-white text-[#1E293B] border-slate-400 group-hover:border-[#3393B8]"
                        }`}
                      >
                        {idx + 1}
                      </span>

                      {/* Year & Full Title Label Positioned Above or Below Road */}
                      <span
                        className={`absolute left-1/2 -translate-x-1/2 w-44 text-center pointer-events-none transition-all duration-300 ${
                          placeAbove ? "bottom-10" : "top-10"
                        }`}
                      >
                        <span
                          className={`inline-block text-xs font-bold tabular-nums ${
                            isActive ? "text-[#E60000]" : "text-[#22577A]"
                          }`}
                        >
                          {item.year}
                        </span>
                        <span
                          className={`block text-[11px] leading-snug font-semibold line-clamp-2 ${
                            isActive ? "text-[#14171A]" : "text-slate-600"
                          }`}
                        >
                          {item.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Compact Vertical Roadmap Track */}
          {milestones.length > 0 && (
            <div className="md:hidden relative pl-6 space-y-2.5 mb-5">
              <div
                aria-hidden="true"
                className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200"
              />
              {milestones.map((item, idx) => {
                const isActive = idx === safeIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    aria-pressed={isActive}
                    className={`relative w-full text-left rounded-xl px-4 py-3 border transition-all cursor-pointer ${
                      isActive
                        ? "bg-white border-[#3393B8] shadow-xs"
                        : "bg-white/75 border-slate-200/80"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[22px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isActive ? "bg-[#E60000] scale-115" : "bg-[#22577A]"
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#E60000] tabular-nums">
                        {item.year}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[#14171A] mt-0.5">
                      {item.title}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Auto-Running Active Station Showcase Card */}
          {activeMilestone && (
            <div className="relative rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-[0_14px_38px_-22px_rgba(34,87,122,0.18)]">
              <div className="px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeMilestone.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider">
                        <span className="text-[#E60000] tabular-nums">
                          Stop 0{safeIdx + 1} / 0{milestones.length}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          |
                        </span>
                        <span className="text-[#22577A] tabular-nums">
                          {activeMilestone.year}
                        </span>
                      </div>
                      <h3 className="mt-1 text-lg sm:text-xl font-semibold text-[#14171A] tracking-tight">
                        {activeMilestone.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#5F6672] max-w-2xl">
                        {activeMilestone.summary}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {milestones.length > 1 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Previous milestone"
                      onClick={() =>
                        setActiveIdx((prev) => getPrevSlideIndex(prev, milestones.length))
                      }
                      className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <LeftOutlined className="text-xs" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next milestone"
                      onClick={() =>
                        setActiveIdx((prev) => getNextSlideIndex(prev, milestones.length))
                      }
                      className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <RightOutlined className="text-xs" />
                    </button>
                  </div>
                )}
              </div>

              {/* Synchronized Auto-Advance Road Progress Track */}
              {!isPaused && milestones.length > 1 && (
                <div className="w-full h-1 bg-slate-100 overflow-hidden">
                  <motion.div
                    key={`${safeIdx}-${speedMs}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: speedMs / 1000, ease: "linear" }}
                    style={{ transformOrigin: "left" }}
                    className="h-full w-full bg-gradient-to-r from-[#3393B8] via-[#22577A] to-[#E60000]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}

type ScaledLogoItem = LogoLoopItem & {
  scale: number;
  label: string;
};

function RibbonLogoImg({
  src,
  alt,
  scale,
}: {
  src: string;
  alt: string;
  scale: number;
}) {
  const [failed, setFailed] = useState(false);
  const safeSrc = sanitizeAboutImage(src, "");
  const safeScale = clampLogoScale(scale, 1);
  const renderedHeight = Math.round(42 * safeScale);

  if (!safeSrc || failed) {
    return (
      <div
        data-logo-scale={safeScale}
        style={{ height: `${renderedHeight}px`, minWidth: `${Math.round(renderedHeight * 2.2)}px` }}
        className="flex items-center justify-center px-3 rounded-lg bg-slate-100 text-[#22577A] font-bold tracking-tight text-sm select-none"
      >
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      data-logo-scale={safeScale}
      data-logo-name={alt}
      className="h-[72px] flex items-center justify-center px-2"
    >
      <img
        src={safeSrc}
        alt={alt}
        title={alt}
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
        style={{ height: `${renderedHeight}px`, width: "auto" }}
        className="object-contain block select-none opacity-90 hover:opacity-100 transition-all duration-300 hover:scale-105"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Our Partners Section (Logos Only, Varied Scales, Auto-Sliding Ribbon)   */
/* -------------------------------------------------------------------------- */
export function OurPartnersSection({
  partners,
  ribbonSpeed = DEFAULT_PARTNERS_RIBBON_SPEED,
}: {
  partners: PartnerItem[];
  ribbonSpeed?: number;
}) {
  const safeSpeed = clampRibbonSpeed(ribbonSpeed, DEFAULT_PARTNERS_RIBBON_SPEED);
  const ribbonLogos: ScaledLogoItem[] = partners.map((partner) => ({
    src: partner.logo,
    alt: partner.name,
    label: partner.name,
    scale: clampLogoScale(partner.scale, 1),
  }));

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="our-partners"
        aria-label="Our Partners"
        className="w-full bg-white py-8 sm:py-10 overflow-hidden"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Supply & Engineering"
            heading="Our Partners"
            tagline="Certified extrusion mills, architectural glass foundries, and European hardware makers."
            editTab="partners"
            editLabel="Manage Partners"
          />
        </div>

        <div
          data-ribbon-section="partners"
          data-ribbon-speed={safeSpeed}
          className="w-full max-w-[1640px] mx-auto px-2 sm:px-6"
        >
          <LogoLoop
            logos={ribbonLogos}
            speed={safeSpeed}
            direction="left"
            logoHeight={72}
            gap={48}
            pauseOnHover
            fadeOut
            fadeOutColor="#ffffff"
            ariaLabel="Our Partners logos ribbon"
            renderItem={(item) => {
              const typed = item as ScaledLogoItem;
              return (
                <RibbonLogoImg
                  src={"src" in typed ? typed.src : ""}
                  alt={typed.label}
                  scale={typed.scale}
                />
              );
            }}
          />
        </div>
      </section>
    </MotionConfig>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Our Clients Section (Logos Only, Varied Scales, Auto-Sliding Ribbon)    */
/* -------------------------------------------------------------------------- */
export function OurClientsSection({
  clients,
  ribbonSpeed = DEFAULT_CLIENTS_RIBBON_SPEED,
}: {
  clients: ClientItem[];
  ribbonSpeed?: number;
}) {
  const safeSpeed = clampRibbonSpeed(ribbonSpeed, DEFAULT_CLIENTS_RIBBON_SPEED);
  const ribbonLogos: ScaledLogoItem[] = clients.map((client) => ({
    src: client.logo,
    alt: client.name,
    label: client.name,
    scale: clampLogoScale(client.scale, 1),
  }));

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="our-clients"
        aria-label="Our Clients"
        className="w-full bg-slate-50/75 border-y border-slate-100 py-8 sm:py-10 overflow-hidden"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Trusted Commissions"
            heading="Our Clients"
            tagline="Residential developers, commercial towers, and architectural practices building with Innovista."
            editTab="clients"
            editLabel="Manage Clients"
          />
        </div>

        <div
          data-ribbon-section="clients"
          data-ribbon-speed={safeSpeed}
          className="w-full max-w-[1640px] mx-auto px-2 sm:px-6"
        >
          <LogoLoop
            logos={ribbonLogos}
            speed={safeSpeed}
            direction="right"
            logoHeight={72}
            gap={48}
            pauseOnHover
            fadeOut
            fadeOutColor="#f8fafc"
            ariaLabel="Our Clients logos ribbon"
            renderItem={(item) => {
              const typed = item as ScaledLogoItem;
              return (
                <RibbonLogoImg
                  src={"src" in typed ? typed.src : ""}
                  alt={typed.label}
                  scale={typed.scale}
                />
              );
            }}
          />
        </div>
      </section>
    </MotionConfig>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Client Feedbacks Section (3D Depth Stack + Auto-Glide Animation)        */
/* -------------------------------------------------------------------------- */
const feedbackSlideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? 44 : -44,
    scale: 0.97,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -44 : 44,
    scale: 0.97,
  }),
};

export function ClientFeedbackSection({
  feedbacks,
  feedbackSpeedMs = DEFAULT_FEEDBACK_SPEED_MS,
}: {
  feedbacks: ClientFeedbackItem[];
  feedbackSpeedMs?: number;
}) {
  const speedMs = clampSlideshowSpeedMs(feedbackSpeedMs, DEFAULT_FEEDBACK_SPEED_MS);
  const [[activeIndex, direction], setSlideState] = useState<[number, number]>([0, 1]);
  const [isPaused, setIsPaused] = useState(false);

  const safeIndex = activeIndex >= feedbacks.length ? 0 : activeIndex;
  const featured = feedbacks[safeIndex];

  const handleNext = useCallback(() => {
    setSlideState(([prev]) => [getNextSlideIndex(prev, feedbacks.length), 1]);
  }, [feedbacks.length]);

  const handlePrev = useCallback(() => {
    setSlideState(([prev]) => [getPrevSlideIndex(prev, feedbacks.length), -1]);
  }, [feedbacks.length]);

  const handleSelectIndex = useCallback(
    (nextIdx: number) => {
      setSlideState(([prev]) => [nextIdx, nextIdx >= prev ? 1 : -1]);
    },
    []
  );

  useEffect(() => {
    if (feedbacks.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setSlideState(([prev]) => [getNextSlideIndex(prev, feedbacks.length), 1]);
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [feedbacks.length, isPaused, speedMs]);

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="client-feedbacks"
        aria-label="Client Feedbacks"
        data-feedback-active={safeIndex}
        data-feedback-speed={speedMs}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className="w-full bg-white py-8 sm:py-11"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Verified Outcomes"
            heading="Client Feedbacks"
            tagline="Direct reflections from property developers, corporate workplace leads, and project architects."
            editTab="feedbacks"
            editLabel="Manage Feedbacks"
          />

          {/* Interactive 3D Depth Stack Spotlight Card */}
          {featured && (
            <div className="relative mb-6 pb-3">
              {/* Layered 3D Stack Depth Backdrop Cards */}
              {feedbacks.length > 2 && (
                <div
                  aria-hidden="true"
                  className="hidden sm:block absolute inset-x-8 top-4 bottom-0 rounded-[24px] border border-slate-200/70 bg-slate-50/80 scale-[0.95] pointer-events-none"
                />
              )}
              {feedbacks.length > 1 && (
                <div
                  aria-hidden="true"
                  className="hidden sm:block absolute inset-x-4 top-2 bottom-1.5 rounded-[24px] border border-slate-200/80 bg-white/95 scale-[0.975] shadow-xs pointer-events-none"
                />
              )}

              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={featured.id}
                  custom={direction}
                  variants={feedbackSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 w-full rounded-[24px] border border-slate-200/85 bg-gradient-to-br from-[#F8FAFC] to-white overflow-hidden shadow-[0_20px_50px_-24px_rgba(15,23,42,0.16)]"
                >
                  <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
                    <div className="lg:col-span-4 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={featured.image}
                        alt={featured.project}
                        fallbackText={featured.company}
                        className="w-full h-full object-cover block"
                      />
                    </div>

                    <div className="lg:col-span-8">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div
                          className="flex items-center gap-1 text-amber-500"
                          aria-label={`${featured.rating} out of 5 stars`}
                        >
                          {Array.from({ length: featured.rating }).map((_, idx) => (
                            <StarFilled key={idx} className="text-sm" />
                          ))}
                        </div>

                        {feedbacks.length > 1 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Previous feedback"
                              onClick={handlePrev}
                              className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <LeftOutlined className="text-xs" />
                            </button>
                            <button
                              type="button"
                              aria-label="Next feedback"
                              onClick={handleNext}
                              className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <RightOutlined className="text-xs" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        className="mt-3.5 text-lg sm:text-xl font-medium text-[#14171A] leading-relaxed"
                      >
                        &ldquo;{featured.comment}&rdquo;
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-sm text-[#14171A]">
                          {featured.clientName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{featured.role}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#22577A] font-medium">
                          {featured.company}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{featured.project}</span>
                      </div>
                    </div>
                  </div>

                  {/* Synchronized Auto-Advance Testimonial Progress Track */}
                  {!isPaused && feedbacks.length > 1 && (
                    <div className="w-full h-1 bg-slate-100 overflow-hidden">
                      <motion.div
                        key={`${safeIndex}-${speedMs}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: speedMs / 1000, ease: "linear" }}
                        style={{ transformOrigin: "left" }}
                        className="h-full w-full bg-gradient-to-r from-[#3393B8] via-[#22577A] to-[#E60000]"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Compact Feedback Selector Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {feedbacks.map((item, idx) => {
              const isSelected = idx === safeIndex;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className={`text-left rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-sky-50/55 border-[#3393B8] shadow-xs"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-500">
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: item.rating }).map((_, starIdx) => (
                        <StarFilled key={starIdx} />
                      ))}
                    </span>
                    <span className="text-slate-500 truncate">{item.project}</span>
                  </div>

                  <p className="mt-2.5 text-xs sm:text-sm text-[#475569] leading-relaxed line-clamp-2">
                    &ldquo;{item.comment}&rdquo;
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="font-semibold text-[#14171A]">
                      {item.clientName}
                    </div>
                    <div className="text-slate-500">
                      {item.role} · {item.company}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
