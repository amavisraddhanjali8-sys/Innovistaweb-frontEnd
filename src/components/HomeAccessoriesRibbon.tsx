import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit3 } from "react-icons/fi";
import LogoLoop, { type LogoLoopItem } from "./LogoLoop";
import { useAuth } from "../Context/AuthContext";
import {
  DEFAULT_ACCESSORIES_RIBBON_HEADING,
  DEFAULT_ACCESSORIES_RIBBON_SUBHEADING,
  clampAccessoriesRibbonSpeed,
  type HomeAccessoryRibbonItem,
} from "../utils/homeTopPicksHelpers";

type HomeRibbonLoopEntry = LogoLoopItem & {
  item: HomeAccessoryRibbonItem;
};

interface HomeAccessoriesRibbonProps {
  heading?: string;
  subheading?: string;
  speed?: number;
  items: HomeAccessoryRibbonItem[];
}

export default function HomeAccessoriesRibbon({
  heading = DEFAULT_ACCESSORIES_RIBBON_HEADING,
  subheading = DEFAULT_ACCESSORIES_RIBBON_SUBHEADING,
  speed = 45,
  items,
}: HomeAccessoriesRibbonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const visibleItems = useMemo(
    () => (items || []).filter((item) => item.active !== false && Boolean(item.image)),
    [items]
  );

  const ribbonEntries: HomeRibbonLoopEntry[] = useMemo(
    () =>
      visibleItems.map((item) => ({
        src: item.image,
        alt: item.title,
        item,
      })),
    [visibleItems]
  );

  if (ribbonEntries.length === 0) {
    return null;
  }

  const safeSpeed = clampAccessoriesRibbonSpeed(speed, 45);

  return (
    <div
      data-home-accessories-ribbon="true"
      data-ribbon-speed={safeSpeed}
      className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-200/80 space-y-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-bold text-[#14171A] tracking-tight m-0">
            {heading}
          </h3>
          {subheading && (
            <p className="text-xs sm:text-sm text-slate-600 m-0 max-w-2xl">
              {subheading}
            </p>
          )}
        </div>

        {user?.role === "admin" && (
          <Link
            to="/admin-home?tab=top-picks"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] no-underline shadow-2xs transition-colors"
          >
            <FiEdit3 className="text-xs" />
            <span>Setup Ribbon Images</span>
          </Link>
        )}
      </div>

      <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 py-4 px-2 sm:px-3 overflow-hidden">
        <LogoLoop
          logos={ribbonEntries}
          speed={safeSpeed}
          direction="left"
          logoHeight={116}
          gap={20}
          pauseOnHover
          fadeOut
          fadeOutColor="#f8fafc"
          ariaLabel={heading}
          renderItem={(entry) => {
            const typed = entry as HomeRibbonLoopEntry;
            const acc = typed.item;
            return (
              <button
                type="button"
                onClick={() => navigate(acc.linkTo || "/products")}
                title={acc.subtitle ? `${acc.title} · ${acc.subtitle}` : acc.title}
                aria-label={`View ${acc.title}`}
                className="group relative flex flex-col w-[184px] sm:w-[200px] rounded-xl border border-slate-200/90 hover:border-[#3393B8] bg-white overflow-hidden shadow-[0_6px_18px_-12px_rgba(34,87,122,0.28)] transition-all duration-200 cursor-pointer p-0 text-left"
              >
                <div className="w-full h-[92px] sm:h-[100px] bg-slate-100 overflow-hidden">
                  <img
                    src={acc.image}
                    alt={acc.title}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 block"
                  />
                </div>
                <div className="px-2.5 py-2 bg-white border-t border-slate-100 w-full">
                  <div className="text-[11.5px] font-bold text-[#14171A] group-hover:text-[#22577A] truncate">
                    {acc.title}
                  </div>
                  {acc.subtitle && (
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {acc.subtitle}
                    </div>
                  )}
                </div>
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}
