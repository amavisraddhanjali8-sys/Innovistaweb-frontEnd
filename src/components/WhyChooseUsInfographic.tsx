import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { App as AntdApp } from "antd";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiDroplet,
  FiLayers,
  FiShield,
  FiSliders,
  FiVolumeX,
} from "react-icons/fi";
import { useAuth } from "../Context/AuthContext";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import AboutTaglineHeading from "./AboutTaglineHeading";
import RequestQuoteModal from "./RequestQuoteModal";
import type {
  WhyChooseAccent,
  WhyChooseIcon,
  WhyChooseItem,
} from "../utils/productCatalogHelpers";

interface WhyChooseUsInfographicProps {
  heading?: string;
  items: WhyChooseItem[];
}

const ACCENT_MAP: Record<
  WhyChooseAccent,
  { stroke: string; text: string; softBg: string; border: string }
> = {
  navy: {
    stroke: "#22577A",
    text: "#22577A",
    softBg: "#EEF5F9",
    border: "#CBE0EC",
  },
  blue: {
    stroke: "#3393B8",
    text: "#22577A",
    softBg: "#EFF8FC",
    border: "#BEE3F1",
  },
  cyan: {
    stroke: "#5CB6D2",
    text: "#1B6B8A",
    softBg: "#F1FAFD",
    border: "#C3E8F4",
  },
  red: {
    stroke: "#E60000",
    text: "#B91C1C",
    softBg: "#FEF2F2",
    border: "#FECACA",
  },
};

function renderInfographicIcon(icon: WhyChooseIcon) {
  switch (icon) {
    case "shield":
      return <FiShield className="text-lg" />;
    case "acoustic":
      return <FiVolumeX className="text-lg" />;
    case "weather":
      return <FiDroplet className="text-lg" />;
    case "craft":
      return <FiAward className="text-lg" />;
    case "speed":
      return <FiClock className="text-lg" />;
    case "precision":
    default:
      return <FiCompass className="text-lg" />;
  }
}

export default function WhyChooseUsInfographic({
  heading = "Why Choose Us",
  items,
}: WhyChooseUsInfographicProps) {
  const { message } = AntdApp.useApp();
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const displayItems = items && items.length > 0 ? items : [];

  if (displayItems.length === 0) return null;

  const gridColsClass =
    displayItems.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : displayItems.length <= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <section
      aria-label={heading}
      className="w-full bg-[#F8FAFC] border-t border-slate-200/80 py-12 sm:py-16"
    >
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Simple Signature Header — No description */}
        <div className="flex flex-col items-center">
          <AboutTaglineHeading heading={heading} align="center" compact />
          {user?.role === "admin" && (
            <Link
              to="/ProductCategoriesAdmin?tab=whychoose"
              className="-mt-1 mb-6 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] px-3.5 py-1.5 text-xs font-semibold text-[#22577A] no-underline transition-colors"
            >
              <FiSliders className="text-xs" />
              <span>Edit Why Choose Us</span>
            </Link>
          )}
        </div>

        {/* Connected Architectural Infographic Stage */}
        <div className="relative mt-4">
          {/* Desktop Horizontal Connector Blueprint Rail */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-[92px] left-[12%] right-[12%] h-[2px] bg-[#CBE0EC] pointer-events-none"
          />

          <div className={`relative z-10 grid ${gridColsClass} gap-6 items-stretch`}>
            {displayItems.map((item, idx) => {
              const palette = ACCENT_MAP[item.accent] || ACCENT_MAP.navy;
              const pct = Math.min(100, Math.max(10, Number(item.percent) || 90));
              const dashOffset = circumference * (1 - pct / 100);
              const stepLabel = String(idx + 1).padStart(2, "0");

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0.9, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: "some" }}
                  transition={{
                    duration: 0.38,
                    delay: Math.min(idx * 0.06, 0.25),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group bg-white rounded-2xl border border-slate-200/85 hover:border-[#3393B8]/60 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_rgba(34,87,122,0.08)] transition-all duration-200 p-6 flex flex-col items-center text-center"
                >
                  {/* Top Step + Icon Header */}
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 tabular-nums mb-3">
                    <span>{stepLabel}</span>
                    <span
                      style={{
                        backgroundColor: palette.softBg,
                        color: palette.text,
                        borderColor: palette.border,
                      }}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                    >
                      {renderInfographicIcon(item.icon)}
                    </span>
                  </div>

                  {/* SVG Infographic Precision Ring Gauge */}
                  <div className="relative w-32 h-32 flex items-center justify-center my-1">
                    <svg
                      viewBox="0 0 128 128"
                      className="w-full h-full -rotate-90"
                      aria-hidden="true"
                    >
                      <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="8"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r={radius - 10}
                        fill="none"
                        stroke={palette.border}
                        strokeWidth="1.25"
                        strokeDasharray="3 5"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke={palette.stroke}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={false}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{
                          duration: 0.75,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
                      <span
                        style={{ color: palette.text }}
                        className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums leading-none"
                      >
                        {item.metric}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar Baseline */}
                  <div className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden mt-3 mb-3">
                    <div
                      style={{
                        width: `${pct}%`,
                        backgroundColor: palette.stroke,
                      }}
                      className="h-full rounded-full"
                    />
                  </div>

                  {/* Simple Title Only — No Description */}
                  <h3 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h3>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Simple Action Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                message.info(
                  "Please create a customer account to request a quotation."
                );
                navigate(
                  buildSignupRedirectUrl(
                    `${location.pathname}${location.search}`,
                    "quote"
                  )
                );
                return;
              }
              setQuoteModalOpen(true);
            }}
            className="request-quote-fx inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
          >
            <FiCheckCircle className="relative z-10" />
            <span className="relative z-10">Request Quote</span>
            <FiArrowRight className="relative z-10" />
          </button>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#22577A] text-[#22577A] text-xs font-semibold no-underline transition-colors whitespace-nowrap"
          >
            <FiLayers />
            <span>Our Projects</span>
          </Link>
        </div>
      </div>

      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
      />
    </section>
  );
}
