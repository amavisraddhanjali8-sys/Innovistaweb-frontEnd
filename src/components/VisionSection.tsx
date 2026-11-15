import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "antd";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import detailFacadeImg from "../assets/images/about_detail_facade_1794510180768.jpg";
import detailTerraceImg from "../assets/images/about_detail_terrace_1794510181976.jpg";
import detailPavilionImg from "../assets/images/about_detail_pavilion_1794510183119.jpg";
import {
  DEFAULT_ABOUT_SECTIONS,
  DEFAULT_CLIENTS,
  DEFAULT_CLIENTS_RIBBON_SPEED,
  DEFAULT_CLIENT_FEEDBACKS,
  DEFAULT_DIRECTOR_MESSAGE,
  DEFAULT_FEEDBACK_SPEED_MS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_JOURNEY_MILESTONES,
  DEFAULT_JOURNEY_SPEED_MS,
  DEFAULT_PARTNERS,
  DEFAULT_PARTNERS_RIBBON_SPEED,
  DEFAULT_SLIDESHOW_SPEED_MS,
  DEFAULT_TEAM_MEMBERS,
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
} from "../utils/aboutContentHelpers";
import AboutTaglineHeading from "./AboutTaglineHeading";

interface DetailShowcaseItem {
  id: string;
  title: string;
  category: string;
  spec: string;
  description: string;
  image: string;
}

const DEFAULT_PAYLOAD: AboutCmsPayload = {
  slideshowSpeedMs: DEFAULT_SLIDESHOW_SPEED_MS,
  journeySpeedMs: DEFAULT_JOURNEY_SPEED_MS,
  feedbackSpeedMs: DEFAULT_FEEDBACK_SPEED_MS,
  partnersRibbonSpeed: DEFAULT_PARTNERS_RIBBON_SPEED,
  clientsRibbonSpeed: DEFAULT_CLIENTS_RIBBON_SPEED,
  heroSlides: DEFAULT_HERO_SLIDES,
  vision: DEFAULT_ABOUT_SECTIONS.vision,
  mission: DEFAULT_ABOUT_SECTIONS.mission,
  directorMessage: DEFAULT_DIRECTOR_MESSAGE,
  teamMembers: DEFAULT_TEAM_MEMBERS,
  journeyMilestones: DEFAULT_JOURNEY_MILESTONES,
  partners: DEFAULT_PARTNERS,
  clients: DEFAULT_CLIENTS,
  clientFeedbacks: DEFAULT_CLIENT_FEEDBACKS,
};

const ARCHITECTURAL_PILLARS = [
  {
    code: "01",
    title: "Thermally Broken Frames",
    text: "Slim-profile extruded aluminium engineered for tropical heat rejection and acoustic quiet.",
  },
  {
    code: "02",
    title: "Structural Glass Integrity",
    text: "Certified laminated and toughened glazing fabricated to exact architectural tolerances.",
  },
  {
    code: "03",
    title: "Turnkey Installation",
    text: "Dedicated CAD detailing, powder-coating finishes, and precision on-site erection across Sri Lanka.",
  },
];

interface VisionSectionProps {
  content?: AboutCmsPayload;
}

export default function VisionSection({ content: externalContent }: VisionSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [internalContent, setInternalContent] = useState<AboutCmsPayload>(DEFAULT_PAYLOAD);
  const content = externalContent || internalContent;

  const [selectedVillaImg, setSelectedVillaImg] = useState<string>(
    content.vision.mainImage
  );
  const [activeThumbIndex, setActiveThumbIndex] = useState<number>(0);
  const [inspectedCard, setInspectedCard] = useState<DetailShowcaseItem | null>(null);

  useEffect(() => {
    setSelectedVillaImg(content.vision.mainImage);
  }, [content.vision.mainImage]);

  useEffect(() => {
    if (externalContent) return;
    let active = true;
    const loadContent = async () => {
      try {
        const res = await AxiosConfig.get("/about/vision-mission");
        if (!active || !res.data) return;
        const normalized = normalizeAboutCmsPayload(res.data, DEFAULT_PAYLOAD);
        setInternalContent(normalized);
        setSelectedVillaImg(normalized.vision.mainImage);
      } catch {
        // Keep defaults
      }
    };
    loadContent();
    return () => {
      active = false;
    };
  }, [externalContent]);

  const detailCards: DetailShowcaseItem[] = [
    {
      id: "detail-1",
      title: "Corner Facade & Curtain Walls",
      category: "Structural Glazing",
      spec: "22mm Slim Sightline",
      description:
        "Floor-to-ceiling anodized aluminium mullions and double-glazed low-E corner glass engineered for unobstructed coastal views.",
      image: detailFacadeImg,
    },
    {
      id: "detail-2",
      title: "Frameless Terrace Balustrades",
      category: "Tempered Safety Glass",
      spec: "12mm + 12mm Laminated",
      description:
        "Concealed U-channel aluminium base shoes holding crystal-clear safety glass railings with flush architectural deck transitions.",
      image: detailTerraceImg,
    },
    {
      id: "detail-3",
      title: "Pavilion Sliding Systems",
      category: "Acoustic Openings",
      spec: "Multi-Track Heavy Duty",
      description:
        "Precision stainless-steel roller systems carrying full-height sliding panels that open living spaces completely to the outdoors.",
      image: detailPavilionImg,
    },
  ];

  const handleThumbSelect = (img: string, idx: number) => {
    setActiveThumbIndex(idx);
    setSelectedVillaImg(img);
  };

  return (
    <section className="w-full bg-white pb-8 sm:pb-10">
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Quiet Admin Edit Link when logged in as Admin */}
        {user?.role === "admin" && (
          <div className="flex justify-end pb-3">
            <Link
              to="/EditVisionMission"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-950 border border-neutral-200 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Edit Vision &amp; Mission
            </Link>
          </div>
        )}

        {/* Section 2: Split Feature Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center py-3 sm:py-6">
          {/* Left Column: Signature Title + Tagline + Short Description + 2 Architectural Thumbnails */}
          <div className="lg:col-span-5">
            <AboutTaglineHeading
              kicker={content.vision.tagline || content.vision.badge}
              heading={content.vision.title}
              tagline={content.vision.description}
              align="left"
              compact
            />

            {/* 2 Clean Interactive Thumbnails */}
            <div className="mt-7 grid grid-cols-2 gap-3.5 max-w-[380px]">
              {content.vision.thumbnails.map((thumb, idx) => {
                const isActive = activeThumbIndex === idx;
                return (
                  <button
                    key={thumb.id}
                    type="button"
                    aria-label={`Preview ${thumb.title}`}
                    aria-pressed={isActive}
                    onClick={() => handleThumbSelect(thumb.image, idx)}
                    className={`group relative w-full block p-0 rounded-2xl overflow-hidden bg-slate-100 border aspect-[16/10] cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E9CBE] ${
                      isActive
                        ? "border-[#3393B8] ring-2 ring-[#3393B8]/35"
                        : "border-slate-200 opacity-85 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={thumb.image}
                      alt={thumb.title}
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 block"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Clean Floating Modern Residence */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <div className="w-full max-w-[780px] aspect-[4/3] rounded-[24px] overflow-hidden bg-white flex items-center justify-center">
              <img
                key={selectedVillaImg}
                src={selectedVillaImg}
                alt="Minimalist architectural glass and aluminium residence"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                style={
                  selectedVillaImg.includes("reference_villa_main")
                    ? {
                        maskImage:
                          "linear-gradient(to bottom, transparent 0%, black 8%, black 96%, transparent 100%)",
                        WebkitMaskImage:
                          "linear-gradient(to bottom, transparent 0%, black 8%, black 96%, transparent 100%)",
                      }
                    : undefined
                }
                className={`w-full h-full transition-all duration-500 block ${
                  selectedVillaImg.includes("reference_villa_main")
                    ? "object-contain"
                    : "object-cover rounded-[24px]"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bottom 3-Card Architectural Gallery */}
        <div className="pt-6 sm:pt-8">
          <div className="mb-2">
            <AboutTaglineHeading
              kicker={content.mission.tagline || content.mission.badge}
              heading={content.mission.title}
              tagline={content.mission.description}
              align="center"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {detailCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setInspectedCard(card)}
                className="group w-full flex flex-col p-0 text-left rounded-[24px] overflow-hidden bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_18px_40px_-15px_rgba(15,23,42,0.10)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E9CBE]"
              >
                <div className="w-full aspect-[4/3] overflow-hidden bg-sky-50">
                  <img
                    src={card.image}
                    alt={card.title}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 block"
                  />
                </div>
                <div className="w-full px-5 py-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{card.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{card.spec}</span>
                  </div>
                  <h3 className="mt-1 text-[16px] font-semibold text-[#14171A] tracking-tight">
                    {card.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Quiet Editorial Pillars & Navigation Strip */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ARCHITECTURAL_PILLARS.map((item) => (
              <div key={item.code}>
                <div className="text-xs font-medium text-[#3E9CBE] tabular-nums">
                  {item.code}.
                </div>
                <h3 className="mt-1.5 text-[15px] font-semibold text-[#14171A]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#5F6672]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/milestones")}
              className="px-5 py-2.5 rounded-xl bg-[#14171A] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Explore Our Milestones
            </button>
            <button
              type="button"
              onClick={() => navigate("/request-quote")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-[#14171A] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Request Fabrication Quote
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Architectural Detail Modal */}
      <Modal
        open={Boolean(inspectedCard)}
        onCancel={() => setInspectedCard(null)}
        footer={null}
        centered
        width="min(640px, calc(100vw - 24px))"
        title={
          inspectedCard ? (
            <span className="text-base font-semibold text-[#14171A]">{inspectedCard.title}</span>
          ) : null
        }
      >
        {inspectedCard && (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-sky-50">
              <img
                src={inspectedCard.image}
                alt={inspectedCard.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover block"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{inspectedCard.category}</span>
              <span aria-hidden="true">·</span>
              <span>{inspectedCard.spec}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">{inspectedCard.description}</p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setInspectedCard(null);
                  navigate("/products");
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Browse Products
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectedCard(null);
                  navigate("/request-quote");
                }}
                className="request-quote-fx min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                <span className="relative z-10">Request Quote</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
