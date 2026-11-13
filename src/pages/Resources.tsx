import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import {
  FiArrowRight,
  FiArrowUp,
  FiArrowUpRight,
  FiChevronDown,
  FiDownload,
  FiSliders,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import LogoLoop, { type LogoLoopItem } from "../components/LogoLoop";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import type { HeroSlide } from "../utils/aboutContentHelpers";
import {
  DEFAULT_ATTACHMENTS_RIBBON_SPEED,
  ENGINEERING_GUIDELINES,
  RELATED_PORTALS,
  RESOURCE_ATTACHMENTS,
  RESOURCE_FAQS,
  getAttachmentDownloadHref,
  getCollageTileSpanClass,
  getGuidelineStepIndex,
  normalizeRelatedPortals,
  type RelatedPortalItem,
  type ResourceAttachmentItem,
} from "../utils/siteContentHelpers";

type AttachmentRibbonItem = LogoLoopItem & {
  doc: ResourceAttachmentItem;
};

const RESOURCES_HERO_SLIDES: HeroSlide[] = [
  {
    id: "res-hero-1",
    headline: "Technical Resources",
    subheadline: "Spec sheets, hardware partner portals, site guidelines, and FAQs.",
    image: "/assets/products/facade-detail.jpg",
  },
  {
    id: "res-hero-2",
    headline: "CAD Schedules & Manuals",
    subheadline: "Download framing tolerances and coastal finish maintenance guides.",
    image: "/assets/products/window.jpg",
  },
  {
    id: "res-hero-3",
    headline: "Hardware Partner Network",
    subheadline: "Direct access to certified European fitting & seal directories.",
    image: "/assets/about/pavilion.jpg",
  },
];

export default function Resources() {
  const { user } = useAuth();
  const [openFaqId, setOpenFaqId] = useState<string>(RESOURCE_FAQS[0].id);
  const [portals, setPortals] = useState<RelatedPortalItem[]>(RELATED_PORTALS);
  const [activeStepCode, setActiveStepCode] = useState<string>(
    ENGINEERING_GUIDELINES[0].code
  );
  const activeStepIdx = getGuidelineStepIndex(activeStepCode);

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ data?: RelatedPortalItem[] }>("/api/resources/portals")
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res.data?.data)) {
          setPortals(normalizeRelatedPortals(res.data.data));
        }
      })
      .catch(() => {
        // Keep seeded defaults if network fails
      });
    return () => {
      active = false;
    };
  }, []);

  const attachmentLoopItems: AttachmentRibbonItem[] = RESOURCE_ATTACHMENTS.map(
    (doc) => ({
      src: doc.image,
      alt: doc.title,
      title: doc.title,
      doc,
    })
  );

  return (
    <div className="w-full bg-white flex flex-col">
      <ShowcaseHeroSlideshow
        slides={RESOURCES_HERO_SLIDES}
        slideshowSpeedMs={5000}
        ariaLabel="Technical resources highlights"
        eyebrowText="Resources & Downloads"
      />

      {/* Section 1: Downloadable Attachments — Full-Image Clickable Card Ribbon Slideshow */}
      <MotionConfig reducedMotion="user">
        <section
          id="download-attachments"
          aria-label="Download Attachments Ribbon"
          className="w-full bg-white py-10 sm:py-12 overflow-hidden"
        >
          <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
            <AboutTaglineHeading
              kicker="Technical Files"
              heading="Download Attachments"
              tagline="Click any specification card below to download the technical document."
              align="center"
            />
          </div>

          <div
            data-testid="attachments-ribbon-slideshow"
            data-ribbon-speed={DEFAULT_ATTACHMENTS_RIBBON_SPEED}
            className="w-full max-w-[1640px] mx-auto px-2 sm:px-6 lg:px-8"
          >
            <LogoLoop
              logos={attachmentLoopItems}
              speed={DEFAULT_ATTACHMENTS_RIBBON_SPEED}
              direction="left"
              logoHeight={235}
              gap={20}
              pauseOnHover
              fadeOut
              fadeOutColor="#ffffff"
              ariaLabel="Downloadable technical documents ribbon slideshow"
              renderItem={(item, key) => {
                const { doc } = item as AttachmentRibbonItem;
                const isPrimarySequence = key.startsWith("0-");
                return (
                  <a
                    href={getAttachmentDownloadHref(doc.id)}
                    download={doc.fileName}
                    draggable={false}
                    tabIndex={isPrimarySequence ? undefined : -1}
                    aria-label={`Download ${doc.title} (${doc.format}, ${doc.fileSize})`}
                    className="group relative block w-[290px] sm:w-[335px] h-[235px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3393B8] no-underline text-base leading-normal transition-all"
                  >
                    <img
                      src={doc.image}
                      alt={doc.title}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="!w-full !h-full !object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/15"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/95 text-[#22577A] flex items-center justify-center shadow-sm group-hover:bg-[#22577A] group-hover:text-white transition-colors"
                    >
                      <FiDownload className="text-sm" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
                        <span>{doc.format}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-200 font-normal">
                          {doc.fileSize}
                        </span>
                      </div>
                      <h3
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        className="mt-1 text-[15px] sm:text-base font-bold text-white leading-snug m-0 line-clamp-2"
                      >
                        {doc.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-200/90 leading-relaxed m-0 line-clamp-2">
                        {doc.summary}
                      </p>
                    </div>
                  </a>
                );
              }}
            />
          </div>
        </section>
      </MotionConfig>

      {/* Section 2: Related Portals & Hardware Clickable Image Collage */}
      {portals.length > 0 && (
        <section
          aria-label="Related Hardware and Portals Collage"
          className="w-full bg-[#F8FAFC] py-10 sm:py-12 border-y border-slate-200/80"
        >
          <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="relative">
              <AboutTaglineHeading
                kicker="Directory"
                heading="Related Hardware & Portals"
                tagline="Click any system or partner image to open its portal directly."
                align="center"
              />
              {user?.role === "admin" && (
                <div className="flex justify-center -mt-4 mb-6 sm:mt-0 sm:mb-0 sm:absolute sm:top-0 sm:right-0">
                  <Link
                    to="/PortalsAdmin"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#22577A] no-underline shadow-xs transition-colors"
                  >
                    <FiSliders className="text-xs" />
                    <span>Manage Portals</span>
                  </Link>
                </div>
              )}
            </div>

            <div
              data-testid="portals-image-collage"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 auto-rows-[205px] sm:auto-rows-[225px] gap-4"
            >
              {portals.map((portal, idx) => {
                const spanClass = getCollageTileSpanClass(idx, portals.length);
                const tileContent = (
                  <>
                    <img
                      src={portal.image}
                      alt={portal.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/90 text-[#22577A] flex items-center justify-center shadow-sm group-hover:bg-[#22577A] group-hover:text-white transition-colors"
                    >
                      {portal.isExternal ? (
                        <FiArrowUpRight className="text-sm" />
                      ) : (
                        <FiArrowRight className="text-sm" />
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                      <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                        {portal.category}
                      </span>
                      <h3
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        className="mt-0.5 text-base sm:text-lg font-bold text-white leading-snug m-0"
                      >
                        {portal.name}
                      </h3>
                      {portal.summary && (
                        <p className="mt-1 text-xs text-slate-200/90 m-0 line-clamp-1">
                          {portal.summary}
                        </p>
                      )}
                    </div>
                  </>
                );

                const sharedClassName = `group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-xs hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3393B8] transition-all block no-underline ${spanClass}`;

                return portal.isExternal ? (
                  <a
                    key={portal.id}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${portal.name} (${portal.category}) — Opens external portal`}
                    className={sharedClassName}
                  >
                    {tileContent}
                  </a>
                ) : (
                  <Link
                    key={portal.id}
                    to={portal.url}
                    aria-label={`${portal.name} (${portal.category})`}
                    className={sharedClassName}
                  >
                    {tileContent}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Step-Wise Client Web & Contact Guidelines */}
      <section
        id="engineering-guidelines"
        aria-label="Engineering Guidelines"
        className="w-full bg-white py-10 sm:py-12"
      >
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Client Guide"
            heading="Engineering Guidelines"
            tagline="Follow these four simple steps to explore systems, download specs, and contact our team."
            align="center"
          />

          {/* Connected Step Progress Track (Desktop) */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-5 mb-6 relative">
            {ENGINEERING_GUIDELINES.map((item, idx) => {
              const isActive = idx === activeStepIdx;
              const isCompleted = idx < activeStepIdx;
              const leftActive = idx > 0 && idx <= activeStepIdx;
              const rightActive =
                idx < ENGINEERING_GUIDELINES.length - 1 && idx < activeStepIdx;

              return (
                <div
                  key={item.code}
                  className="relative flex items-center justify-center"
                >
                  {idx > 0 && (
                    <div
                      aria-hidden="true"
                      className={`absolute -left-2.5 right-1/2 top-1/2 -translate-y-1/2 h-[2px] transition-colors duration-300 ${
                        leftActive ? "bg-[#3393B8]" : "bg-slate-200"
                      }`}
                    />
                  )}
                  {idx < ENGINEERING_GUIDELINES.length - 1 && (
                    <div
                      aria-hidden="true"
                      className={`absolute left-1/2 -right-2.5 top-1/2 -translate-y-1/2 h-[2px] transition-colors duration-300 ${
                        rightActive
                          ? "bg-gradient-to-r from-[#22577A] to-[#3393B8]"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveStepCode(item.code)}
                    aria-pressed={isActive}
                    aria-label={`${item.stepLabel}: ${item.title}`}
                    className={`relative z-10 w-8 h-8 rounded-full text-xs font-bold tabular-nums flex items-center justify-center transition-all cursor-pointer border ${
                      isActive
                        ? "bg-gradient-to-r from-[#22577A] to-[#3393B8] text-white border-transparent shadow-sm scale-110"
                        : isCompleted
                        ? "bg-[#22577A] text-white border-[#22577A]"
                        : "bg-white text-[#22577A] border-slate-300 hover:border-[#3393B8]"
                    }`}
                  >
                    {item.code}
                  </button>
                </div>
              );
            })}
          </div>

          <div
            data-testid="engineering-guidelines-steps"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {ENGINEERING_GUIDELINES.map((item, idx) => {
              const isActive = idx === activeStepIdx;
              const isHashTarget = item.actionTo.startsWith("#");
              const targetId = isHashTarget ? item.actionTo.slice(1) : "";
              return (
                <div
                  key={item.code}
                  data-step-active={isActive ? "true" : "false"}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                    isActive
                      ? "bg-white border-[#3393B8] shadow-[0_14px_34px_-22px_rgba(34,87,122,0.28)]"
                      : "bg-[#F8FAFC] border-slate-200 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveStepCode(item.code)}
                    className="text-left bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3393B8] rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                      <span
                        className={
                          isActive ? "text-[#E60000]" : "text-[#3393B8]"
                        }
                      >
                        {item.stepLabel}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        /
                      </span>
                      <span className="text-[#5F6672] font-medium">
                        {item.code}
                      </span>
                    </div>
                    <h3
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="mt-2 text-[15px] font-bold text-[#14171A] m-0"
                    >
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5F6672] leading-relaxed m-0">
                      {item.summary}
                    </p>
                  </button>

                  <div className="mt-4 pt-3 border-t border-slate-200/75">
                    {isHashTarget ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStepCode(item.code);
                          document
                            .getElementById(targetId)
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22577A] hover:text-[#E60000] bg-transparent border-0 p-0 cursor-pointer whitespace-nowrap transition-colors"
                      >
                        <span>{item.actionLabel}</span>
                        <FiArrowUp className="text-xs" />
                      </button>
                    ) : (
                      <Link
                        to={item.actionTo}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22577A] hover:text-[#E60000] no-underline whitespace-nowrap transition-colors"
                      >
                        <span>{item.actionLabel}</span>
                        <FiArrowRight className="text-xs" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: FAQs */}
      <section className="w-full bg-white pb-14">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Common Questions"
            heading="FAQs"
            tagline="Direct answers on lead times, finishes, and quotations."
            align="center"
          />

          <div className="space-y-3">
            {RESOURCE_FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqId(isOpen ? "" : faq.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left bg-white hover:bg-[#F8FAFC] border-0 cursor-pointer transition-colors"
                  >
                    <span
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="text-sm font-bold text-[#14171A]"
                    >
                      {faq.question}
                    </span>
                    <FiChevronDown
                      className={`text-slate-500 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#22577A]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-[#5F6672] leading-relaxed border-t border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#14171A] m-0">
                Need project-specific technical advice?
              </h3>
              <p className="text-xs text-[#5F6672] mt-0.5 mb-0">
                Connect directly with our engineering and estimation desk.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/contact"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
              >
                Contact Desks
              </Link>
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold no-underline"
              >
                <span>Request Quote</span>
                <FiArrowRight className="text-xs" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
