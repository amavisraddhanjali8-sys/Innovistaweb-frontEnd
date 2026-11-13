import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiSliders } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import WhyChooseUsInfographic from "../components/WhyChooseUsInfographic";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  normalizeProductCategory,
  normalizeProductLandingCms,
  type ProductCategory,
  type ProductLandingCms,
} from "../utils/productCatalogHelpers";

export default function Products() {
  const { user } = useAuth();
  const [landingCms, setLandingCms] = useState<ProductLandingCms>(
    DEFAULT_PRODUCT_LANDING_CMS
  );
  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );

  useEffect(() => {
    let active = true;
    const loadCms = async () => {
      try {
        const cmsRes = await AxiosConfig.get("/products/cms");
        if (!active) return;

        if (cmsRes.data?.landing) {
          setLandingCms(normalizeProductLandingCms(cmsRes.data.landing));
        }
        if (
          Array.isArray(cmsRes.data?.categories) &&
          cmsRes.data.categories.length > 0
        ) {
          setCategories(
            cmsRes.data.categories.map((cat: Partial<ProductCategory>, idx: number) =>
              normalizeProductCategory(cat, idx)
            )
          );
        }
      } catch {
        // Keep verified local defaults cleanly
      }
    };

    loadCms();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full bg-white flex flex-col">
      {/* 1. Simple Architectural Product Hero Slideshow */}
      <ShowcaseHeroSlideshow
        slides={landingCms.heroSlides}
        slideshowSpeedMs={landingCms.slideshowSpeedMs}
        ariaLabel="Innovista Product Portfolio Slideshow"
        hideSubheadline
        adminManageTo="/ProductCategoriesAdmin?tab=slideshow"
        adminManageLabel="Edit Slideshow"
      />

      {/* 2. Simple Description-Free Product Categories Grid */}
      <section className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-10 sm:pt-14 pb-12 sm:pb-16">
        <div className="flex flex-col items-center">
          <AboutTaglineHeading
            heading={landingCms.categoriesHeading}
            align="center"
            compact
          />
          {user?.role === "admin" && (
            <Link
              to="/ProductCategoriesAdmin?tab=categories"
              className="-mt-1 mb-6 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#22577A] px-3.5 py-1.5 text-xs font-semibold text-[#22577A] no-underline transition-colors"
            >
              <FiSliders className="text-xs" />
              <span>Manage Categories</span>
            </Link>
          )}
        </div>

        <PageAdBannerSlideshow pageKey="products" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mt-2">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.CategoryID}
              initial={{ opacity: 0.9, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: "some" }}
              transition={{
                duration: 0.32,
                delay: Math.min(idx * 0.04, 0.2),
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex"
            >
              <Link
                to={`/products/category/${cat.slug}`}
                className="group w-full bg-white rounded-2xl border border-slate-200/85 hover:border-[#3393B8]/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_rgba(34,87,122,0.10)] transition-all duration-200 overflow-hidden flex flex-col no-underline"
              >
                <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                  <img
                    src={cat.coverImage}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="px-4 py-4 sm:px-5 flex items-center justify-between gap-3">
                  <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-[#22577A] transition-colors truncate">
                    {cat.name}
                  </h3>
                  <FiArrowRight className="text-base text-[#22577A] shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Infographics Style "Why Choose Us" Section (Editable in Admin Panel) */}
      <WhyChooseUsInfographic
        heading={landingCms.whyChooseHeading}
        items={landingCms.whyChooseUs}
      />
    </div>
  );
}
