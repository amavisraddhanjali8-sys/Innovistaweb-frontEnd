import { useState } from "react";
import { Link } from "react-router-dom";
import AccessoryCardShuffleDeck from "./AccessoryCardShuffleDeck";
import RequestQuoteModal from "./RequestQuoteModal";
import { sanitizeDesignImages, type DesignItem } from "../utils/productCatalogHelpers";

interface ProductSystemCardProps {
  design: DesignItem;
}

export default function ProductSystemCard({ design }: ProductSystemCardProps) {
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const images = sanitizeDesignImages(design.Design_Image);
  const accessories = design.accessories || [];
  const detailPath = `/products/${encodeURIComponent(String(design.DesignID))}`;

  return (
    <>
      <article className="group bg-white border border-slate-200/90 hover:border-[#3393B8]/70 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:shadow-[0_14px_30px_rgba(34,87,122,0.10)] transition-all duration-300 flex flex-col overflow-hidden">
        {/* Top Full-Bleed Architectural Photo */}
        <Link
          to={detailPath}
          aria-label={`View full details for ${design.Design_Name}`}
          className="block relative aspect-[4/3] w-full bg-slate-100 overflow-hidden"
        >
          <img
            src={images[0]}
            alt={design.Design_Name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        {/* Clean Centered Title, Accessory Card Shuffle Deck (if configured) & Full-Width Quote Action */}
        <div className="px-4 pt-4 pb-4 flex-1 flex flex-col justify-between gap-3 bg-white">
          <div className="w-full flex flex-col items-center gap-3">
            <Link
              to={detailPath}
              className="text-[15px] font-bold text-center leading-snug line-clamp-2 no-underline transition-opacity group-hover:opacity-90"
            >
              <span
                style={{
                  background:
                    "linear-gradient(to right, #e60000 0%, #6a2c40 22%, #22577a 50%, #6a2c40 78%, #e60000 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {design.Design_Name}
              </span>
            </Link>

            {accessories.length > 0 && (
              <AccessoryCardShuffleDeck
                accessories={accessories}
                mode="compact"
                shuffleIntervalMs={design.accessoriesSlideshowSpeedMs || 2800}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => setQuoteModalOpen(true)}
            className="request-quote-fx w-full py-2.5 px-4 rounded-xl text-white text-[13px] font-semibold transition-all cursor-pointer"
          >
            <span className="relative z-10">Request Quote</span>
          </button>
        </div>
      </article>

      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        productId={design.DesignID}
        productName={design.Design_Name}
        categoryName={design.Categories?.[0]}
      />
    </>
  );
}
