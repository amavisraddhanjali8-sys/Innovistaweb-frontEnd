import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiGrid,
  FiLayers,
  FiSearch,
  FiTool,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import TactileActionButton from "./TactileActionButton";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  normalizeDesignItem,
  normalizeProductCategory,
  type DesignItem,
  type ProductCategory,
} from "../utils/productCatalogHelpers";
import {
  DEFAULT_HOME_SERVICES_CMS,
  normalizeHomeServicesCms,
  type HomeServiceItem,
} from "../utils/homeServicesHelpers";
import {
  buildSearchSubmitRoute,
  searchHomeCatalog,
  type HomeSearchResultItem,
} from "../utils/homeSearchHelpers";

export default function HomeSearchBar() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const [designs, setDesigns] = useState<DesignItem[]>(DEFAULT_DESIGNS_CATALOG);
  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );
  const [services, setServices] = useState<HomeServiceItem[]>(
    DEFAULT_HOME_SERVICES_CMS.items
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      AxiosConfig.get<{ data?: DesignItem[] }>("/designs/all", {
        params: { page: 1, limit: 100 },
      }),
      AxiosConfig.get("/products/categories"),
      AxiosConfig.get("/api/home-services"),
    ])
      .then(([designsRes, catsRes, svcRes]) => {
        if (!active) return;

        if (Array.isArray(designsRes.data?.data) && designsRes.data.data.length > 0) {
          setDesigns(designsRes.data.data.map((d) => normalizeDesignItem(d)));
        }

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

        if (svcRes.data?.data) {
          setServices(normalizeHomeServicesCms(svcRes.data.data).items);
        }
      })
      .catch(() => {
        // Seeded local catalog remains ready
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        setHighlightedIdx(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(
    () =>
      searchHomeCatalog({
        query,
        categorySlug,
        designs,
        categories,
        services,
        maxCategories: query.trim() ? 4 : 4,
        maxProducts: query.trim() ? 6 : 4,
        maxSolutions: query.trim() ? 3 : 2,
      }),
    [query, categorySlug, designs, categories, services]
  );

  const flatItems: HomeSearchResultItem[] = useMemo(
    () => [
      ...searchResults.categories,
      ...searchResults.products,
      ...searchResults.solutions,
    ],
    [searchResults]
  );

  const navigateToResult = (item: HomeSearchResultItem) => {
    setDropdownOpen(false);
    setHighlightedIdx(-1);
    navigate(item.to);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (highlightedIdx >= 0 && flatItems[highlightedIdx]) {
      navigateToResult(flatItems[highlightedIdx]);
      return;
    }
    setDropdownOpen(false);
    setHighlightedIdx(-1);
    navigate(buildSearchSubmitRoute(query, categorySlug));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setDropdownOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatItems.length === 0) return;
      setHighlightedIdx((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatItems.length === 0) return;
      setHighlightedIdx((prev) =>
        prev <= 0 ? flatItems.length - 1 : prev - 1
      );
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      setHighlightedIdx(-1);
      inputRef.current?.blur();
    }
  };

  const renderGroup = (
    heading: string,
    icon: React.ReactNode,
    items: HomeSearchResultItem[],
    startOffset: number
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="py-1.5">
        <div className="px-3.5 py-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {icon}
          <span>{heading}</span>
        </div>
        {items.map((item, idx) => {
          const globalIdx = startOffset + idx;
          const isHighlighted = globalIdx === highlightedIdx;
          return (
            <button
              key={item.id}
              id={`home-search-opt-${globalIdx}`}
              type="button"
              role="option"
              aria-selected={isHighlighted}
              onMouseEnter={() => setHighlightedIdx(globalIdx)}
              onClick={() => navigateToResult(item)}
              className={`w-full px-3.5 py-2 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                isHighlighted ? "bg-sky-50/90" : "hover:bg-slate-50"
              }`}
            >
              <img
                src={item.image}
                alt={item.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackApplied) {
                    target.dataset.fallbackApplied = "1";
                    target.src = "/assets/products/door.jpg";
                  }
                }}
                className="w-10 h-10 rounded-lg object-cover border border-slate-200/80 shrink-0 bg-slate-100"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {item.subtitle}
                </div>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-[#22577A] shrink-0">
                {item.meta}
              </span>
              <FiArrowRight className="text-slate-400 text-xs shrink-0" />
            </button>
          );
        })}
      </div>
    );
  };

  const catStart = 0;
  const prodStart = searchResults.categories.length;
  const solStart = prodStart + searchResults.products.length;

  return (
    <section
      aria-label="Quick Product and Architectural Solution Search"
      className="w-full flex justify-center pt-2 pb-6 sm:pb-8 px-3 sm:px-4 relative z-40"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-[1160px]"
      >
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search architectural products and solutions"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 rounded-2xl border border-slate-200/95 bg-white shadow-[0_10px_30px_-16px_rgba(15,23,42,0.16)] p-1.5 transition-shadow focus-within:border-[#22577A]/70 focus-within:shadow-[0_12px_34px_-14px_rgba(34,87,122,0.22)]"
        >
          {/* Category Scope Dropdown */}
          <div className="sm:border-r border-slate-200 sm:pr-2">
            <select
              aria-label="Filter search by category"
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value);
                setHighlightedIdx(-1);
                setDropdownOpen(true);
              }}
              className="w-full sm:w-[175px] h-10 px-3 rounded-xl bg-slate-50 sm:bg-transparent text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200/70 sm:border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22577A]/40 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.CategoryID} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 flex items-center min-w-0">
            <FiSearch className="ml-3 text-slate-400 text-base shrink-0 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              value={query}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
                setHighlightedIdx(-1);
              }}
              onKeyDown={handleKeyDown}
              aria-label="Search products or architectural solutions"
              aria-expanded={dropdownOpen}
              aria-controls="home-search-listbox"
              aria-activedescendant={
                dropdownOpen && highlightedIdx >= 0
                  ? `home-search-opt-${highlightedIdx}`
                  : undefined
              }
              aria-autocomplete="list"
              placeholder="Search products or architectural solutions (e.g. sliding doors, windows, louvers)..."
              className="w-full h-10 pl-2.5 pr-8 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border-0 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => {
                  setQuery("");
                  setHighlightedIdx(-1);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Submit Button */}
          <TactileActionButton
            type="submit"
            tone="azure"
            size="sm"
            icon={<FiSearch className="text-sm" />}
            className="h-10 px-5"
          >
            Search
          </TactileActionButton>
        </form>

        {/* Instant Search Suggestions Dropdown */}
        {dropdownOpen && (
          <div
            id="home-search-listbox"
            role="listbox"
            aria-label="Search suggestions"
            className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_-14px_rgba(15,23,42,0.22)] overflow-hidden max-h-[420px] overflow-y-auto z-50 divide-y divide-slate-100"
          >
            {flatItems.length > 0 ? (
              <>
                {renderGroup(
                  query.trim() ? "Matching Categories" : "Popular Categories",
                  <FiGrid className="text-[11px]" />,
                  searchResults.categories,
                  catStart
                )}
                {renderGroup(
                  query.trim() ? "Matching Products" : "Featured Systems",
                  <FiLayers className="text-[11px]" />,
                  searchResults.products,
                  prodStart
                )}
                {renderGroup(
                  "Architectural Solutions",
                  <FiTool className="text-[11px]" />,
                  searchResults.solutions,
                  solStart
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(buildSearchSubmitRoute(query, categorySlug));
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50/80 hover:bg-sky-50/70 flex items-center justify-between text-xs font-semibold text-[#22577A] cursor-pointer transition-colors"
                >
                  <span>
                    {query.trim()
                      ? `View all catalog results for "${query.trim()}"`
                      : "Browse full architectural product catalog"}
                  </span>
                  <FiArrowRight className="text-xs" />
                </button>
              </>
            ) : (
              <div className="px-4 py-6 text-center space-y-2">
                <p className="text-xs sm:text-sm font-medium text-slate-600 m-0">
                  No direct match found for &ldquo;{query.trim()}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/products");
                  }}
                  className="text-xs font-semibold text-[#22577A] hover:underline cursor-pointer bg-transparent border-0"
                >
                  Explore all categories &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
