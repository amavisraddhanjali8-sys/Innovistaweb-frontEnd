import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { message } from "antd";
import { useAuth } from "../Context/AuthContext";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import RequestQuoteModal from "./RequestQuoteModal";
import { sanitizeDesignImages, type DesignItem } from "../utils/productCatalogHelpers";

interface ProductSystemCardProps {
  design: DesignItem;
}

export default function ProductSystemCard({ design }: ProductSystemCardProps) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const images = sanitizeDesignImages(design.Design_Image);
  const detailPath = `/products/${encodeURIComponent(String(design.DesignID))}`;

  const handleRequestQuoteClick = () => {
    if (!isLoggedIn) {
      message.info("Please create a customer account to request a quotation.");
      navigate(
        buildSignupRedirectUrl(`${location.pathname}${location.search}`, "quote")
      );
      return;
    }
    setQuoteModalOpen(true);
  };

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

        {/* Clean Centered Title & Full-Width Quote Action */}
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
          </div>

          <button
            type="button"
            onClick={handleRequestQuoteClick}
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
