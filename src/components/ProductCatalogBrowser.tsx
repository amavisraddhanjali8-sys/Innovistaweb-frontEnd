import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, Slider } from "antd";
import {
  FiRotateCcw,
  FiSearch,
  FiShoppingBag,
  FiSliders,
} from "react-icons/fi";
import ProductSystemCard from "./ProductSystemCard";
import {
  FINISH_COLOR_FILTERS,
  countActiveFilters,
  createInitialFilterState,
  designMatchesCategory,
  filterAndSortDesigns,
  type DesignItem,
  type FinishColorFamily,
  type ProductCategory,
  type ProductFilterState,
  type ProductSortOption,
} from "../utils/productCatalogHelpers";
import { formatCurrencyLkr } from "../utils/adminPortalHelpers";

interface ProductCatalogBrowserProps {
  designs: DesignItem[];
  categories: ProductCategory[];
  lockedCategorySlug?: string;
  loading?: boolean;
  onSelectCategorySlug?: (slug: string) => void;
}

const SIZE_FILTER_OPTIONS: Array<{
  key: ProductFilterState["sizeFilter"];
  label: string;
}> = [
  { key: "all", label: "All Sizing" },
  { key: "standard", label: "Standard Modules" },
  { key: "custom", label: "Custom Engineered" },
];

export default function ProductCatalogBrowser({
  designs,
  categories,
  lockedCategorySlug,
  loading = false,
  onSelectCategorySlug,
}: ProductCatalogBrowserProps) {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<ProductFilterState>(() =>
    createInitialFilterState(lockedCategorySlug || "all")
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [cartIds, setCartIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "[]");
      return Array.isArray(saved) ? saved.map(String) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("cart") || "[]");
        setCartIds(Array.isArray(saved) ? saved.map(String) : []);
      } catch {
        setCartIds([]);
      }
    };
    window.addEventListener("innovista-cart-updated", syncCart);
    return () => window.removeEventListener("innovista-cart-updated", syncCart);
  }, []);

  useEffect(() => {
    if (lockedCategorySlug) {
      setFilter((prev) => ({
        ...prev,
        categorySlug: lockedCategorySlug,
      }));
    }
  }, [lockedCategorySlug]);

  const maxCatalogPrice = useMemo(() => {
    const prices = designs
      .map((d) => Number(d.price) || 0)
      .filter((p) => p > 0);
    return prices.length > 0 ? Math.max(800000, ...prices) : 800000;
  }, [designs]);

  const filteredDesigns = useMemo(
    () => filterAndSortDesigns(designs, categories, filter),
    [designs, categories, filter]
  );

  const activeFilterCount = useMemo(
    () => countActiveFilters(filter, Boolean(lockedCategorySlug)),
    [filter, lockedCategorySlug]
  );

  const categoryMatchCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) {
      map.set(
        cat.slug,
        designs.filter((d) => designMatchesCategory(d, cat)).length
      );
    }
    return map;
  }, [designs, categories]);

  const handleResetFilters = () => {
    setFilter(createInitialFilterState(lockedCategorySlug || "all"));
  };

  const handleCategoryChange = (slug: string) => {
    setFilter((prev) => ({ ...prev, categorySlug: slug }));
    onSelectCategorySlug?.(slug);
  };

  return (
    <div className="w-full space-y-6">
      {/* Enhanced Multi-Facet Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/85 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0 max-w-xl">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              aria-label="Search architectural designs"
              placeholder="Search aluminium systems, doors, louvers, acoustic glass..."
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-slate-50 border border-slate-200/90 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#22577A] focus:outline-none transition-colors"
            />
            {filter.searchQuery && (
              <button
                type="button"
                onClick={() =>
                  setFilter((prev) => ({ ...prev, searchQuery: "" }))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Sort:
              </span>
              <Select
                aria-label="Sort product designs"
                value={filter.sortBy}
                onChange={(val: ProductSortOption) =>
                  setFilter((prev) => ({ ...prev, sortBy: val }))
                }
                style={{ width: 175 }}
                options={[
                  { label: "Featured Order", value: "featured" },
                  { label: "Price: Low to High", value: "price-asc" },
                  { label: "Price: High to Low", value: "price-desc" },
                  { label: "Name: A to Z", value: "name-asc" },
                  { label: "Newest Systems", value: "newest" },
                ]}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              aria-expanded={showAdvancedFilters}
              className={`h-9 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                showAdvancedFilters ||
                filter.colorFamily !== "all" ||
                filter.sizeFilter !== "all" ||
                filter.maxPrice !== null
                  ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8]"
              }`}
            >
              <FiSliders className="text-xs" />
              <span>Finishes & Specs</span>
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              >
                <FiRotateCcw className="text-xs" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}

            {cartIds.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("/OrderCart")}
                className="h-9 px-3.5 rounded-xl bg-sky-50 border border-sky-200 hover:border-[#3393B8] text-xs font-semibold text-[#22577A] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors tabular-nums"
              >
                <FiShoppingBag className="text-xs" />
                <span>Cart ({cartIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Strip */}
        {!lockedCategorySlug && categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleCategoryChange("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border tabular-nums ${
                filter.categorySlug === "all"
                  ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-white hover:border-[#3393B8]"
              }`}
            >
              All Systems ({designs.length})
            </button>

            {categories.map((cat) => {
              const isSelected = filter.categorySlug === cat.slug;
              const matchCount = categoryMatchCounts.get(cat.slug) ?? 0;
              return (
                <button
                  key={cat.CategoryID}
                  type="button"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border tabular-nums ${
                    isSelected
                      ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-white hover:border-[#3393B8]"
                  }`}
                >
                  {cat.name} ({matchCount})
                </button>
              );
            })}
          </div>
        )}

        {/* Expandable Finish Swatches, Sizing Mode, & Price Ceiling Panel */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Aluminium Finish Alloy
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {FINISH_COLOR_FILTERS.map((swatchItem) => {
                  const isActive = filter.colorFamily === swatchItem.key;
                  return (
                    <button
                      key={swatchItem.key}
                      type="button"
                      onClick={() =>
                        setFilter((prev) => ({
                          ...prev,
                          colorFamily: swatchItem.key as FinishColorFamily,
                        }))
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent"
                          : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8]"
                      }`}
                    >
                      {swatchItem.swatch && (
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: swatchItem.swatch }}
                          className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                        />
                      )}
                      <span>{swatchItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Sizing Profile
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SIZE_FILTER_OPTIONS.map((opt) => {
                  const isActive = filter.sizeFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setFilter((prev) => ({ ...prev, sizeFilter: opt.key }))
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent"
                          : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <span>Max Unit Estimate</span>
                <span className="text-[#22577A] tabular-nums normal-case text-xs font-bold">
                  {filter.maxPrice ? formatCurrencyLkr(filter.maxPrice) : "Any Budget"}
                </span>
              </div>
              <Slider
                min={100000}
                max={maxCatalogPrice}
                step={25000}
                value={filter.maxPrice ?? maxCatalogPrice}
                onChange={(val) =>
                  setFilter((prev) => ({
                    ...prev,
                    maxPrice: val >= maxCatalogPrice ? null : val,
                  }))
                }
              />
            </div>
          </div>
        )}

        {/* Quiet Results Summary Line */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-slate-500 tabular-nums">
          <span>
            Showing <strong className="text-slate-900">{filteredDesigns.length}</strong>{" "}
            {filteredDesigns.length === 1 ? "architectural system" : "architectural systems"}
            {filter.categorySlug !== "all"
              ? ` in ${
                  categories.find((c) => c.slug === filter.categorySlug)?.name ||
                  filter.categorySlug
                }`
              : ""}
          </span>
          {filter.colorFamily !== "all" && (
            <span className="text-[#22577A] font-medium">
              Finish filter:{" "}
              {FINISH_COLOR_FILTERS.find((f) => f.key === filter.colorFamily)?.label}
            </span>
          )}
        </div>
      </div>

      {/* Product Cards Grid matching Reference Card Layout */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="border border-slate-200 bg-white overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 mx-auto bg-slate-200" />
                <div className="h-10 w-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <div className="text-base font-bold text-slate-900">
            No matching systems found
          </div>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Try clearing your finish filter, increasing the unit budget limit, or searching a broader architectural keyword.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer transition-all"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {filteredDesigns.map((design) => (
            <ProductSystemCard key={design.DesignID} design={design} />
          ))}
        </div>
      )}
    </div>
  );
}
