import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowRight, FiLayers, FiSliders } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import ProductCatalogBrowser from "../components/ProductCatalogBrowser";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import RequestQuoteModal from "../components/RequestQuoteModal";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  createDefaultCategorySlides,
  designMatchesCategory,
  findCategoryByParam,
  normalizeProductCategory,
  type DesignItem,
  type ProductCategory,
} from "../utils/productCatalogHelpers";

export default function CategoryLanding() {
  const { slug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryCategory = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("category") || "";
  }, [location.search]);

  const rawParam = slug || queryCategory;

  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );
  const [designs, setDesigns] = useState<DesignItem[]>(DEFAULT_DESIGNS_CATALOG);
  const [loading, setLoading] = useState(true);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [catsRes, designsRes] = await Promise.all([
          AxiosConfig.get("/products/categories"),
          AxiosConfig.get("/designs/all", { params: { page: 1, limit: 100 } }),
        ]);

        if (!active) return;

        const rawCats = Array.isArray(catsRes.data?.data)
          ? catsRes.data.data
          : Array.isArray(catsRes.data)
          ? catsRes.data
          : [];
        if (rawCats.length > 0) {
          setCategories(
            rawCats.map((cat: Partial<ProductCategory>, idx: number) =>
              normalizeProductCategory(cat, idx)
            )
          );
        }
        if (Array.isArray(designsRes.data?.data)) {
          setDesigns(designsRes.data.data);
        }
      } catch {
        // Keep defaults
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const activeCategory: ProductCategory = useMemo(() => {
    const matched = findCategoryByParam(categories, rawParam);
    if (matched) return matched;
    if (rawParam) {
      const displayTitle = decodeURIComponent(rawParam)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return normalizeProductCategory({
        CategoryID: `custom-${rawParam}`,
        name: displayTitle,
        slug: rawParam,
        heroSlides: createDefaultCategorySlides(
          displayTitle,
          "Engineered architectural systems crafted to structural tolerances.",
          "/assets/products/hero-showroom.jpg"
        ),
      });
    }
    return categories[0] || DEFAULT_PRODUCT_CATEGORIES[0];
  }, [categories, rawParam]);

  const categorySlides = useMemo(() => {
    if (activeCategory.heroSlides && activeCategory.heroSlides.length > 0) {
      return activeCategory.heroSlides;
    }
    return createDefaultCategorySlides(
      activeCategory.name,
      activeCategory.tagline,
      activeCategory.coverImage
    );
  }, [activeCategory]);

  const siblingCategories = useMemo(
    () =>
      categories
        .filter((cat) => cat.CategoryID !== activeCategory.CategoryID)
        .slice(0, 4),
    [categories, activeCategory.CategoryID]
  );

  const categorySystemCount = useMemo(
    () => designs.filter((d) => designMatchesCategory(d, activeCategory)).length,
    [designs, activeCategory]
  );

  return (
    <div className="w-full bg-white flex flex-col">
      {/* 1. Category-Specific Hero Slideshow */}
      <ShowcaseHeroSlideshow
        slides={categorySlides}
        slideshowSpeedMs={activeCategory.slideshowSpeedMs}
        ariaLabel={`${activeCategory.name} Category Slideshow`}
        eyebrowText="Product Category Showcase"
        backLink={{ label: "All Categories", to: "/products" }}
        adminManageTo={`/ProductCategoriesAdmin?tab=categories&edit=${encodeURIComponent(
          activeCategory.CategoryID
        )}`}
        adminManageLabel="Edit Category Slideshow"
      />

      {/* 2. Category Engineering Summary & Instant Category Switcher */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="rounded-2xl border border-slate-200/85 bg-[#F8FAFC] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Link
                  to="/products"
                  className="font-semibold text-[#22577A] hover:underline no-underline"
                >
                  Products
                </Link>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-slate-900">
                  {activeCategory.name}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {categorySystemCount}{" "}
                  {categorySystemCount === 1 ? "System" : "Systems"}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {activeCategory.name}
              </h2>

              {activeCategory.specHighlights &&
                activeCategory.specHighlights.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-semibold text-[#22577A]">
                    {activeCategory.specHighlights.map((spec, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2">
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                        )}
                        <span>{spec}</span>
                      </span>
                    ))}
                  </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {user?.role === "admin" && (
                <Link
                  to={`/ProductCategoriesAdmin?tab=categories&edit=${encodeURIComponent(
                    activeCategory.CategoryID
                  )}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#22577A] no-underline transition-colors whitespace-nowrap"
                >
                  <FiSliders />
                  <span>Edit Category</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setQuoteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold transition-all shadow-sm whitespace-nowrap cursor-pointer"
              >
                <FiLayers />
                <span>Request Quote</span>
              </button>
            </div>
          </div>

          {/* Instant Category Switcher Strip */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isCurrent = cat.CategoryID === activeCategory.CategoryID;
              return (
                <button
                  key={cat.CategoryID}
                  type="button"
                  onClick={() => navigate(`/products/category/${cat.slug}`)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isCurrent
                      ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8] hover:text-[#22577A]"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Category Scoped Enhanced Filter & Product Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <PageAdBannerSlideshow pageKey="category" />
        <ProductCatalogBrowser
          designs={designs}
          categories={categories}
          lockedCategorySlug={activeCategory.slug}
          loading={loading}
        />
      </section>

      {/* 4. Browse Other Categories Strip */}
      {siblingCategories.length > 0 && (
        <section className="w-full bg-[#F8FAFC] border-t border-slate-200/80 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center mb-6">
              <AboutTaglineHeading
                heading="Other Categories"
                align="center"
                compact
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {siblingCategories.map((cat) => (
                <Link
                  key={cat.CategoryID}
                  to={`/products/category/${cat.slug}`}
                  className="group bg-white rounded-2xl border border-slate-200/85 hover:border-[#3393B8] shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col no-underline transition-all"
                >
                  <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                    <img
                      src={cat.coverImage}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900 truncate group-hover:text-[#22577A]">
                      {cat.name}
                    </div>
                    <FiArrowRight className="text-[#22577A] shrink-0 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        categoryName={activeCategory.name}
      />
    </div>
  );
}
