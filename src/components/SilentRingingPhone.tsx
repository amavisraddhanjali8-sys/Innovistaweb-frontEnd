import { useState } from "react";
import { FiCheck, FiCopy, FiPhoneCall } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
  formatTelHref,
  formatWhatsAppHref,
} from "../utils/footerConsultationHelpers";

export interface SilentRingingPhoneProps {
  phone: string;
  whatsapp?: string;
  label?: string;
  variant?: "footer" | "card";
}

export default function SilentRingingPhone({
  phone,
  whatsapp,
  label = "Phone Number",
  variant = "footer",
}: SilentRingingPhoneProps) {
  const [isRingingActive, setIsRingingActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const telHref = formatTelHref(phone);
  const waHref = formatWhatsAppHref(whatsapp || phone);

  const handleToggleRing = () => {
    setIsRingingActive((prev) => !prev);
  };

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(phone);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isCard = variant === "card";

  return (
    <div
      className={`group relative flex flex-col gap-2.5 transition-all duration-300 ${
        isCard
          ? "p-0 bg-transparent border-0"
          : "rounded-2xl p-2.5 sm:-m-2.5 bg-white/50 sm:bg-transparent hover:bg-white/95 hover:shadow-[0_10px_28px_-14px_rgba(34,87,122,0.35)] border border-slate-200/60 sm:border-transparent hover:border-[#3393B8]/30"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Silent Ringing Visual Beacon (Zero Audio) */}
        <button
          type="button"
          onClick={handleToggleRing}
          aria-label={`Toggle call options for ${phone}`}
          aria-expanded={isRingingActive}
          className={`silent-ring-beacon relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer border transition-all duration-300 ${
            isCard
              ? isRingingActive
                ? "bg-white text-[#0D4B6A] border-white shadow-[0_0_20px_rgba(255,255,255,0.55)]"
                : "bg-white/16 backdrop-blur-sm text-white border-white/35 hover:bg-white/25"
              : isRingingActive
              ? "bg-gradient-to-br from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-[#5CB6D2]/60 shadow-[0_0_18px_rgba(51,147,184,0.55)]"
              : "bg-white border-slate-200 text-[#3393B8] group-hover:border-[#3393B8]/60 group-hover:text-[#22577A] shadow-xs"
          }`}
          data-active={isRingingActive ? "true" : "false"}
        >
          {/* Expanding silent visual rings */}
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-1"
            style={isCard ? { borderColor: "rgba(255,255,255,0.72)" } : undefined}
          />
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-2"
            style={isCard ? { borderColor: "rgba(255,255,255,0.62)" } : undefined}
          />
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-3"
            style={isCard ? { borderColor: "rgba(255,255,255,0.52)" } : undefined}
          />

          <FiPhoneCall
            aria-hidden="true"
            className="silent-ring-handset relative z-10 text-base"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm sm:text-base font-extrabold tracking-tight ${
                isCard ? "text-white" : "text-[#14171A] text-xs"
              }`}
            >
              {label}
            </span>
            <button
              type="button"
              onClick={handleToggleRing}
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isCard
                  ? isRingingActive
                    ? "bg-white text-[#0D4B6A] border-white shadow-xs"
                    : "bg-white/15 hover:bg-[#FB923C] hover:text-[#111827] hover:border-[#FED7AA] text-white border-white/35"
                  : isRingingActive
                  ? "bg-sky-50 border-[#3393B8]/40 text-[#22577A]"
                  : "bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-[#22577A] hover:border-[#3393B8]/40"
              }`}
            >
              {isRingingActive ? "Ringing" : "Tap to Call"}
            </button>
          </div>

          <a
            href={telHref}
            onClick={() => setIsRingingActive(true)}
            className={`text-sm font-bold no-underline transition-colors block truncate mt-0.5 tabular-nums ${
              isCard
                ? "text-white/95 hover:text-[#FED7AA]"
                : "text-[#22577A] hover:text-[#3393B8] text-xs sm:text-[13px]"
            }`}
          >
            {phone}
          </a>
        </div>
      </div>

      {/* Interactive Call Quick-Actions Drawer */}
      {isRingingActive && (
        <div
          className={`flex flex-wrap items-center gap-2 pt-2 border-t animate-[fadeIn_0.18s_ease-out] ${
            isCard ? "border-white/20" : "border-slate-100"
          }`}
        >
          <a
            href={telHref}
            className="tactile-pill-btn inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold no-underline cursor-pointer"
          >
            <FiPhoneCall className="relative z-10 text-[11px]" />
            <span className="relative z-10">Call Now</span>
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-bold no-underline transition-all ${
              isCard
                ? "bg-emerald-500/30 border-emerald-200/70 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),0_4px_10px_-4px_rgba(0,0,0,0.28)] hover:bg-emerald-400 hover:text-slate-950"
                : "bg-[#25D366]/12 border-[#25D366]/35 text-[#15803d] hover:bg-[#25D366]/20"
            }`}
          >
            <FaWhatsapp className="text-[11px]" />
            <span>WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
              isCard
                ? "bg-white/18 hover:bg-white text-white hover:text-[#0F172A] border-white/40 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.42),0_4px_10px_-4px_rgba(0,0,0,0.24)]"
                : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700"
            }`}
          >
            {copied ? (
              <>
                <FiCheck className={isCard ? "text-emerald-200 text-[11px]" : "text-emerald-600 text-[11px]"} />
                <span className={isCard ? "text-emerald-100" : "text-emerald-700"}>Copied</span>
              </>
            ) : (
              <>
                <FiCopy className="text-[11px]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
