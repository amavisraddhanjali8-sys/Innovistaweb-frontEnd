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

  return (
    <div
      className={`group relative flex flex-col gap-2 rounded-2xl transition-all duration-300 ${
        variant === "card"
          ? "p-3.5 bg-white border border-slate-200/90 hover:border-[#3393B8]/70 shadow-xs"
          : "p-2.5 sm:-m-2.5 bg-white/50 sm:bg-transparent hover:bg-white/95 hover:shadow-[0_10px_28px_-14px_rgba(34,87,122,0.35)] border border-slate-200/60 sm:border-transparent hover:border-[#3393B8]/30"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Silent Ringing Visual Beacon (Zero Audio) */}
        <button
          type="button"
          onClick={handleToggleRing}
          aria-label={`Toggle call options for ${phone}`}
          aria-expanded={isRingingActive}
          className={`silent-ring-beacon relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer border transition-all duration-300 ${
            isRingingActive
              ? "bg-gradient-to-br from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-[#5CB6D2]/60 shadow-[0_0_18px_rgba(51,147,184,0.55)]"
              : "bg-white border-slate-200 text-[#3393B8] group-hover:border-[#3393B8]/60 group-hover:text-[#22577A] shadow-xs"
          }`}
          data-active={isRingingActive ? "true" : "false"}
        >
          {/* Expanding silent visual rings */}
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-1"
          />
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-2"
          />
          <span
            aria-hidden="true"
            className="silent-ring-wave silent-ring-wave-3"
          />

          <FiPhoneCall
            aria-hidden="true"
            className="silent-ring-handset relative z-10 text-base"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-[#14171A]">{label}</span>
            <button
              type="button"
              onClick={handleToggleRing}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isRingingActive
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
            className="text-xs sm:text-[13px] font-semibold text-[#22577A] hover:text-[#3393B8] no-underline transition-colors block truncate mt-0.5 tabular-nums"
          >
            {phone}
          </a>
        </div>
      </div>

      {/* Interactive Call Quick-Actions Drawer */}
      {isRingingActive && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 animate-[fadeIn_0.18s_ease-out]">
          <a
            href={telHref}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#22577A] to-[#3393B8] text-white text-[11px] font-semibold no-underline hover:brightness-110 transition-all"
          >
            <FiPhoneCall className="text-[11px]" />
            <span>Call Now</span>
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366]/12 border border-[#25D366]/35 text-[#15803d] text-[11px] font-semibold no-underline hover:bg-[#25D366]/20 transition-colors"
          >
            <FaWhatsapp className="text-[11px]" />
            <span>WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
          >
            {copied ? (
              <>
                <FiCheck className="text-emerald-600 text-[11px]" />
                <span className="text-emerald-700">Copied</span>
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
