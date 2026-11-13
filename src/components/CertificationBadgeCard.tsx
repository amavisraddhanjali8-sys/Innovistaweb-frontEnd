import type { ProductCertification } from "../utils/productCatalogHelpers";

interface CertificationBadgeCardProps {
  cert: ProductCertification;
  systemName: string;
}

export default function CertificationBadgeCard({
  cert,
  systemName,
}: CertificationBadgeCardProps) {
  return (
    <div className="bg-white border-2 border-slate-800 flex flex-col text-center shadow-[0_2px_8px_rgba(15,23,42,0.04)] h-full">
      {/* Top Compliance Header Strip */}
      <div className="bg-[#22577A] text-white text-[9px] font-bold uppercase tracking-wider py-1.5 px-2">
        Certified Architectural Performance
      </div>

      {/* Main Standard Label */}
      <div className="px-3 py-2.5 border-b border-slate-300">
        <div className="text-[13px] font-bold text-slate-900 leading-tight">
          {cert.standardLabel}
        </div>
        <div className="text-[11px] font-semibold text-[#3393B8] mt-0.5">
          {cert.badgeCode}
        </div>
      </div>

      {/* 2x2 Technical Rating Grid */}
      <div className="grid grid-cols-2 border-b border-slate-300 text-slate-900">
        <div className="p-2.5 border-r border-b border-slate-300">
          <div className="text-[10px] font-medium text-slate-500">U-Factor</div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
            {cert.uFactor}
          </div>
          <div className="text-[9px] text-slate-400">W/m²·K / BTU</div>
        </div>

        <div className="p-2.5 border-b border-slate-300">
          <div className="text-[10px] font-medium text-slate-500">
            Solar Heat Gain
          </div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
            {cert.shgc}
          </div>
          <div className="text-[9px] text-slate-400">SHGC Rating</div>
        </div>

        <div className="p-2.5 border-r border-slate-300">
          <div className="text-[10px] font-medium text-slate-500">
            Energy Rating
          </div>
          <div className="text-base font-extrabold text-[#22577A] tabular-nums mt-0.5">
            {cert.energyRating}
          </div>
        </div>

        <div className="p-2.5">
          <div className="text-[10px] font-medium text-slate-500">
            Visible Transmittance
          </div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
            {cert.visibleTransmittance}
          </div>
        </div>
      </div>

      {/* Manufacturer / System Summary */}
      <div className="px-3 py-2.5 border-b border-slate-300 bg-[#F8FAFC]">
        <div className="text-[11.5px] font-bold text-slate-900 line-clamp-1">
          Innovista Architectural Systems
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">
          {systemName}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
          {cert.specSummary}
        </div>
      </div>

      {/* Bottom Seal Footer */}
      <div className="p-3 flex items-center gap-2.5 text-left flex-1">
        <div className="w-10 h-10 rounded-full bg-[#22577A] flex items-center justify-center shrink-0 text-[10px] font-extrabold text-white shadow-xs">
          SLS
        </div>
        <p className="text-[9.5px] leading-snug text-slate-600 m-0">
          Thermal &amp; structural transmittance values verified against{" "}
          <strong className="text-slate-900">{cert.badgeCode}</strong> laboratory
          testing tolerances.
        </p>
      </div>
    </div>
  );
}
