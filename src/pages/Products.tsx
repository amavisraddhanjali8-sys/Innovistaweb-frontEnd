import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiGrid, FiSliders, FiTool, FiX } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import ProductCatalogBrowser from "../components/ProductCatalogBrowser";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import WhyChooseUsInfographic from "../components/WhyChooseUsInfographic";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import PageMetadata from "../components/PageMetadata";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
  type DesignItem,
  type ProductCategory,
  type ProductLandingCms,
} from "../utils/productCatalogHelpers";
import {
  DEFAULT_HOME_SERVICES_CMS,
  normalizeHomeServicesCms,
  type HomeServiceItem,
} from "../utils/homeServicesHelpers";
import { searchHomeCatalog } from "../utils/homeSearchHelpers";

export default function Products() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearchQuery = (searchParams.get("q") || "").trim();
  const [landingCms, setLandingCms] = useState<ProductLandingCms>(
    DEFAULT_PRODUCT_LANDING_CMS
  );
  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );
  const [designs, setDesigns] = useState<DesignItem[]>(DEFAULT_DESIGNS_CATALOG);
  const [services, setServices] = useState<HomeServiceItem[]>(
    DEFAULT_HOME_SERVICES_CMS.items
  );

  useEffect(() => {
    let active = true;
    const loadCms = async () => {
      try {
        const [cmsRes, designsRes, svcRes] = await Promise.all([
          AxiosConfig.get("/products/cms"),
          AxiosConfig.get<{ data?: DesignItem[] }>("/designs/all", {
            params: { page: 1, limit: 100 },
          }),
          AxiosConfig.get("/api/home-services"),
        ]);
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
        if (Array.isArray(designsRes.data?.data)) {
          setDesigns(designsRes.data.data.map((d) => normalizeDesignItem(d)));
        }
        if (svcRes.data?.data) {
          setServices(normalizeHomeServicesCms(svcRes.data.data).items);
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

  const searchQuickMatches = useMemo(() => {
    if (!activeSearchQuery) {
      return { categories: [], solutions: [] };
    }
    const res = searchHomeCatalog({
      query: activeSearchQuery,
      designs,
      categories,
      services,
      maxCategories: 4,
      maxProducts: 0,
      maxSolutions: 4,
    });
    return { categories: res.categories, solutions: res.solutions };
  }, [activeSearchQuery, designs, categories, services]);

  return (
    <div className="w-full bg-white flex flex-col">
      <PageMetadata
        title="Architectural Aluminium Products & Glazing Catalog"
        description="Browse custom sliding doors, thermally broken casement windows, frameless shower enclosures, curtain walls, louvers, and acoustic office partitions."
        canonicalPath="/products"
        ogImage="/assets/products/hero-showroom.jpg"
      />
      {activeSearchQuery && (
        <section
          aria-label="Product Search Results"
          className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 pb-8"
        >
          <div className="rounded-2xl border border-slate-200/85 bg-slate-50/70 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 m-0">
                  Search Results for &ldquo;{activeSearchQuery}&rdquo;
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 mb-0">
                  Filter by category, finish color, or sizing below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <FiX className="text-xs" />
                <span>Clear Search</span>
              </button>
            </div>
            {(searchQuickMatches.categories.length > 0 ||
              searchQuickMatches.solutions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                {searchQuickMatches.categories.map((catMatch) => (
                  <Link
                    key={catMatch.id}
                    to={catMatch.to}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#3393B8] no-underline transition-colors"
                  >
                    <img
                      src={catMatch.image}
                      alt={catMatch.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#22577A]">
                        <FiGrid className="text-[11px]" />
                        <span>Matching Category</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {catMatch.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {catMatch.subtitle}
                      </div>
                    </div>
                    <FiArrowRight className="text-[#22577A] shrink-0" />
                  </Link>
                ))}
                {searchQuickMatches.solutions.map((solMatch) => (
                  <Link
                    key={solMatch.id}
                    to={solMatch.to}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#3393B8] no-underline transition-colors"
                  >
                    <img
                      src={solMatch.image}
                      alt={solMatch.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#22577A]">
                        <FiTool className="text-[11px]" />
                        <span>Architectural Solution</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {solMatch.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {solMatch.subtitle}
                      </div>
                    </div>
                    <FiArrowRight className="text-[#22577A] shrink-0" />
                  </Link>
                ))}
              </div>
            )}
            <ProductCatalogBrowser
              designs={designs}
              categories={categories}
            />
          </div>
        </section>
      )}

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
