import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit3 } from "react-icons/fi";
import ProductCard from "./ProductCard";
import MainHeading from "./MainHeading";
import HomeAccessoriesRibbon from "./HomeAccessoriesRibbon";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import {
  DEFAULT_DESIGNS_CATALOG,
  normalizeDesignItem,
  type DesignItem,
} from "../utils/productCatalogHelpers";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  getHomeProductDisplayImage,
  normalizeHomeFeaturedProductsCms,
  resolveSelectedHomeDesigns,
  type HomeFeaturedProductsCmsPayload,
} from "../utils/homeTopPicksHelpers";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function FeaturedProducts() {
  const { user } = useAuth();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const cardsRef = React.useRef<(HTMLDivElement | null)[]>([]);

  const [cms, setCms] = useState<HomeFeaturedProductsCmsPayload>(
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const [catalogDesigns, setCatalogDesigns] = useState<DesignItem[]>(() =>
    DEFAULT_DESIGNS_CATALOG.map((d) => normalizeDesignItem(d))
  );

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{
      data?: Partial<HomeFeaturedProductsCmsPayload>;
      allDesigns?: Partial<DesignItem>[];
      designs?: Partial<DesignItem>[];
    }>("/api/home-featured-products")
      .then((cmsRes) => {
        if (!active) return;
        if (cmsRes.data?.data) {
          setCms(normalizeHomeFeaturedProductsCms(cmsRes.data.data));
        }
        const rawList = Array.isArray(cmsRes.data?.allDesigns)
          ? cmsRes.data.allDesigns
          : Array.isArray(cmsRes.data?.designs)
          ? cmsRes.data.designs
          : null;
        if (rawList && rawList.length > 0) {
          setCatalogDesigns(rawList.map((d) => normalizeDesignItem(d)));
        }
      })
      .catch(() => {
        // Keep seeded defaults
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedDesigns = useMemo(
    () =>
      resolveSelectedHomeDesigns(cms.selectedProductIds, catalogDesigns, 6),
    [cms.selectedProductIds, catalogDesigns]
  );

  const selectionSignature = selectedDesigns
    .map((d) => String(d.DesignID))
    .join(",");

  useGSAP(
    () => {
      if (!gridRef.current) return;

      const validCards = cardsRef.current.filter((card) => card !== null);
      if (validCards.length === 0) return;

      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0.2, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
      }

      const sm = gsap.matchMedia();
      sm.add("(max-width: 768px)", () => {
        validCards.forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0.25, y: 20, scale: 0.97 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.5,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      });

      sm.add("(min-width: 769px)", () => {
        validCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { opacity: 0.25, y: 36, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.55,
              delay: Math.min((index % 3) * 0.08, 0.24),
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      });

      return () => {
        sm.revert();
      };
    },
    { scope: containerRef, dependencies: [selectionSignature] }
  );

  const addCardRef = (el: HTMLDivElement | null, index: number) => {
    cardsRef.current[index] = el;
  };

  return (
    <section
      ref={containerRef}
      aria-label="Our Top Picks"
      className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 my-12 sm:my-20 overflow-x-hidden"
    >
      <div ref={headingRef}>
        <MainHeading heading={cms.heading} description={cms.subheading} />
      </div>

      {user?.role === "admin" && (
        <div className="flex justify-end mt-2">
          <Link
            to="/admin-home?tab=top-picks"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] no-underline shadow-xs transition-colors"
          >
            <FiEdit3 className="text-xs" />
            <span>Select Home Products &amp; Accessories</span>
          </Link>
        </div>
      )}

      <div
        ref={gridRef}
        data-home-top-picks-grid="true"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 sm:mt-10"
      >
        {selectedDesigns.map((item, index) => (
          <div
            key={String(item.DesignID)}
            ref={(el) => addCardRef(el, index)}
            className="flex justify-center"
          >
            <ProductCard
              id={String(item.DesignID)}
              image={getHomeProductDisplayImage(item, cms.productImageOverrides)}
              title={item.Design_Name}
              description={item.Design_Description}
            />
          </div>
        ))}
      </div>

      {/* Accessories Ribbon Slideshow directly below Selected Products */}
      {cms.showAccessoriesRibbon && (
        <HomeAccessoriesRibbon
          heading={cms.accessoriesRibbonHeading}
          subheading={cms.accessoriesRibbonSubheading}
          speed={cms.accessoriesRibbonSpeed}
          items={cms.accessoriesRibbonItems}
        />
      )}
    </section>
  );
}

export default FeaturedProducts;
