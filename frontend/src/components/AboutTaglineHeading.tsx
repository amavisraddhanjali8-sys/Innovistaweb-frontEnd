import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import vecBrushSvg from "../assets/svg/Vec.svg";

interface AboutTaglineHeadingProps {
  kicker?: string;
  heading: string;
  tagline?: string;
  align?: "center" | "left";
  editTab?: string;
  editLabel?: string;
  compact?: boolean;
}

export default function AboutTaglineHeading({
  kicker,
  heading,
  tagline,
  align = "center",
  editTab,
  editLabel = "Edit Section",
  compact = false,
}: AboutTaglineHeadingProps) {
  const { user } = useAuth();
  const isCentered = align === "center";

  return (
    <motion.div
      initial={{ opacity: 0.85, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative ${compact ? "mb-3.5" : "mb-4 sm:mb-6"} ${
        isCentered ? "text-center mx-auto max-w-2xl" : "text-left"
      }`}
    >
      {(kicker || (user?.role === "admin" && editTab)) && (
        <div
          className={`flex items-center gap-3 mb-1 ${
            isCentered ? "justify-center" : "justify-between flex-wrap"
          }`}
        >
          {kicker && (
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#22577A]/80">
              {kicker}
            </span>
          )}
          {user?.role === "admin" && editTab && (
            <Link
              to={`/EditVisionMission?tab=${editTab}`}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-950 border border-neutral-200 rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap"
            >
              {editLabel}
            </Link>
          )}
        </div>
      )}

      {/* Signature red-navy-red gradient heading matching MainHeading design */}
      <div className={`flex flex-col ${isCentered ? "items-center" : "items-start"}`}>
        <h2
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textWrap: "balance",
            background:
              "linear-gradient(to right, #e60000 0%, #6a2c40 22%, #22577a 50%, #6a2c40 78%, #e60000 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold tracking-tight leading-[1.15] inline-block"
        >
          {heading}
        </h2>

        {/* Textured black brush-stroke underline matching the uploaded title head */}
        <img
          src={vecBrushSvg}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="mt-1 h-[10px] sm:h-[13px] w-[180px] sm:w-[240px] object-fill select-none pointer-events-none block"
        />
      </div>

      {tagline && (
        <p
          style={{ textWrap: "balance" }}
          className={`mt-2 text-[14px] sm:text-[15px] leading-relaxed text-[#22577A] font-normal ${
            isCentered ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {tagline}
        </p>
      )}
    </motion.div>
  );
}
