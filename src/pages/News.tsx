import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "antd";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiSearch,
  FiX,
} from "react-icons/fi";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import PageMetadata from "../components/PageMetadata";
import {
  NEWS_ARTICLES,
  NEWS_CATEGORIES,
  buildNewsroomEditorialLayout,
  filterNewsArticles,
  type NewsArticleItem,
  type NewsCategory,
} from "../utils/siteContentHelpers";

const SANS_FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const DEPARTMENT_TITLES: Record<Exclude<NewsCategory, "All">, string> = {
  Launches: "Launches & Product Systems",
  Projects: "Landmark Commercial & Villa Handovers",
  Standards: "Quality Audits & Laboratory Standards",
};

export default function News() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeArticle, setActiveArticle] = useState<NewsArticleItem | null>(
    null
  );

  const visibleArticles = useMemo(
    () => filterNewsArticles(NEWS_ARTICLES, selectedCategory, searchQuery),
    [selectedCategory, searchQuery]
  );

  const wireLayout = useMemo(
    () => buildNewsroomEditorialLayout(visibleArticles, NEWS_ARTICLES),
    [visibleArticles]
  );

  const isFilteredView =
    selectedCategory !== "All" || searchQuery.trim().length > 0;

  return (
    <div style={SANS_FONT} className="w-full bg-white text-[#14171A] flex flex-col">
      <PageMetadata
        title={
          activeArticle
            ? activeArticle.title
            : "Newsroom & Technical Dispatches"
        }
        description={
          activeArticle
            ? activeArticle.summary
            : "Latest product launches, commercial curtain wall handovers, and ISO laboratory quality audits from Innovista Fabriconix."
        }
        canonicalPath={
          activeArticle ? `/news?article=${activeArticle.id}` : "/news"
        }
        ogType={activeArticle ? "article" : "website"}
        ogImage={
          activeArticle?.image ||
          visibleArticles[0]?.image ||
          "/assets/about/terrace.jpg"
        }
      />
      {/* Newsroom Corporate Wire Masthead (Crisp Slate Dispatch Band — Distinct from Blogs) */}
      <header className="w-full bg-[#F8FAFC] border-b border-slate-200">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E2A3B]">
                <span>Innovista Press Wire</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-[#22577A]">
                  Company Bulletins &amp; Site Handovers
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-extrabold tracking-tight text-[#14171A] leading-[1.12] mt-1.5 mb-0">
                Newsroom &amp; Technical Dispatches
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {visibleArticles.length} Press Releases
              </span>

              <div className="relative w-full sm:w-72">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="search"
                  aria-label="Search press releases"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search press bulletins..."
                  className="w-full min-h-[40px] pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#22577A]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear news search"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-0 p-1 cursor-pointer"
                  >
                    <FiX className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Segmented Corporate Dispatch Tabs + Quick Cross Links */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Filter news by department"
              className="flex flex-wrap items-center gap-2"
            >
              {NEWS_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedCategory(category)}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? "bg-[#22577A] border-[#22577A] text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-[#3393B8] hover:text-[#22577A]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-xs shrink-0">
              <Link
                to="/resources"
                className="font-semibold text-slate-600 hover:text-[#22577A] no-underline"
              >
                Specs &amp; CAD
              </Link>
              <Link
                to="/blogs"
                className="font-semibold text-[#8E2A3B] hover:underline no-underline"
              >
                Architectural Blogs »
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Newsroom Grid Canvas */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        {visibleArticles.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] py-14 px-6 text-center max-w-md mx-auto">
            <h2 className="text-lg font-bold text-[#14171A] m-0">
              No bulletins found
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 mb-5">
              Clear department filters or search text to view all Innovista press releases.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#22577A] text-white text-xs font-semibold cursor-pointer border-0"
            >
              Show All Releases
            </button>
          </div>
        ) : isFilteredView ? (
          /* Expanded 4-Column Department Bulletin Grid */
          <section aria-label="Filtered Press Bulletins">
            <div className="flex items-center justify-between gap-3 bg-[#F8FAFC] px-4 py-2.5 border-y border-slate-200 mb-7">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  <FiArrowLeft className="text-xs" />
                  <span>All Departments</span>
                </button>
                <span aria-hidden="true" className="text-slate-300">
                  |
                </span>
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#14171A] m-0">
                  {selectedCategory !== "All"
                    ? DEPARTMENT_TITLES[selectedCategory]
                    : "Matching Bulletins"}{" "}
                  ({visibleArticles.length})
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-9">
              {visibleArticles.map((article, idx) => (
                <article
                  key={article.id}
                  className="flex flex-col border-b border-slate-100 pb-5"
                >
                  <button
                    type="button"
                    onClick={() => setActiveArticle(article)}
                    aria-label={`Read press brief: ${article.title}`}
                    className="group w-full aspect-[16/10] rounded-lg overflow-hidden bg-slate-100 border-0 p-0 cursor-pointer block"
                  >
                    <img
                      src={article.image}
                      alt={article.title}
                      loading={idx < 4 ? "eager" : "lazy"}
                      decoding="async"
                      className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 block"
                    />
                  </button>

                  <div className="pt-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em]">
                      <span className="text-[#8E2A3B]">{article.category}</span>
                      <span className="text-slate-400 tabular-nums">
                        {article.date}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-[15.5px] font-bold text-[#14171A] leading-snug tracking-tight m-0">
                      <button
                        type="button"
                        onClick={() => setActiveArticle(article)}
                        className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                      >
                        {article.title}
                      </button>
                    </h3>

                    <p className="mt-2 text-[12.5px] leading-relaxed text-[#5F6672] line-clamp-2 mb-2.5">
                      {article.summary}
                    </p>

                    <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 mb-3">
                      <FiCheckCircle className="text-[#3393B8] shrink-0 mt-0.5 text-[11px]" />
                      <span className="line-clamp-1">
                        {article.highlights[0]}
                      </span>
                    </div>

                    <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11.5px]">
                      <button
                        type="button"
                        onClick={() => setActiveArticle(article)}
                        className="font-bold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Read Brief
                      </button>
                      <Link
                        to={article.ctaTo}
                        className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-[#22577A] no-underline"
                      >
                        <span>{article.ctaLabel}</span>
                        <FiArrowRight className="text-[11px]" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          /* Reference-Inspired 3-Column Wire Front + 4-Column Department Bands */
          <div className="space-y-12">
            {/* TOP 3-COLUMN NEWSROOM DISPATCH HERO */}
            <section
              aria-label="Top Press Dispatches"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 lg:divide-x lg:divide-slate-200"
            >
              {/* Left Column (~24%): 2 Stacked Department Briefs */}
              <div className="lg:col-span-3 lg:pr-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-0 lg:divide-y lg:divide-slate-200 min-w-0">
                {wireLayout.leftBriefs.map((article, idx) => (
                  <article
                    key={article.id}
                    className={idx > 0 ? "lg:pt-6" : "lg:pb-6"}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveArticle(article)}
                      aria-label={`Open release: ${article.title}`}
                      className="group w-full aspect-[16/10] rounded-lg bg-slate-100 overflow-hidden border-0 p-0 cursor-pointer block"
                    >
                      <img
                        src={article.image}
                        alt={article.title}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 block"
                      />
                    </button>

                    <div className="pt-3">
                      <div className="flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em]">
                        <span className="text-[#8E2A3B]">
                          {article.category}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          {article.date}
                        </span>
                      </div>

                      <h2 className="mt-1.5 text-[15.5px] font-bold text-[#14171A] leading-snug m-0">
                        <button
                          type="button"
                          onClick={() => setActiveArticle(article)}
                          className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                        >
                          {article.title}
                        </button>
                      </h2>

                      <p className="mt-1.5 text-[12px] text-[#5F6672] leading-relaxed line-clamp-2 mb-2">
                        {article.summary}
                      </p>

                      <Link
                        to={article.ctaTo}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22577A] hover:underline no-underline"
                      >
                        <span>{article.ctaLabel}</span>
                        <FiArrowRight className="text-[10px]" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Center Column (~51%): Dominant Lead Bulletin (Left-aligned Corporate Spec Sheet) */}
              {wireLayout.centerDispatch && (
                <div className="order-first lg:order-none lg:col-span-6 lg:px-8 min-w-0">
                  <article className="flex flex-col">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveArticle(wireLayout.centerDispatch!)
                      }
                      aria-label={`Open lead bulletin: ${wireLayout.centerDispatch.title}`}
                      className="group relative w-full aspect-[16/10] max-h-[440px] rounded-xl bg-slate-100 overflow-hidden border-0 p-0 cursor-pointer block"
                    >
                      <img
                        src={wireLayout.centerDispatch.image}
                        alt={wireLayout.centerDispatch.title}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500 block"
                      />
                    </button>

                    <div className="pt-4">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                        <span className="text-[#8E2A3B]">
                          Lead Dispatch · {wireLayout.centerDispatch.category}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          /
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                          <FiCalendar className="text-[#3393B8]" />
                          {wireLayout.centerDispatch.date}
                        </span>
                      </div>

                      <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#14171A] leading-[1.15] tracking-tight m-0 text-balance">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveArticle(wireLayout.centerDispatch!)
                          }
                          className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                        >
                          {wireLayout.centerDispatch.title}
                        </button>
                      </h2>

                      <p className="mt-2.5 text-sm text-[#5F6672] leading-relaxed m-0">
                        {wireLayout.centerDispatch.summary}
                      </p>

                      {/* Technical Deliverable Highlights Bar (Unique to Newsroom) */}
                      <ul className="mt-4 list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-y border-slate-200 py-3">
                        {wireLayout.centerDispatch.highlights.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex items-start gap-2 text-xs text-slate-700"
                          >
                            <FiCheckCircle className="text-[#3393B8] shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveArticle(wireLayout.centerDispatch!)
                          }
                          className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0 transition-colors"
                        >
                          <span>Read Full Press Brief</span>
                          <FiArrowRight className="text-xs" />
                        </button>

                        <Link
                          to={wireLayout.centerDispatch.ctaTo}
                          className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:border-[#22577A] text-xs font-bold text-[#14171A] hover:text-[#22577A] no-underline transition-colors"
                        >
                          <span>{wireLayout.centerDispatch.ctaLabel}</span>
                          <FiArrowRight className="text-xs" />
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>
              )}

              {/* Right Column (~25%): LATEST WIRE Numbered Chronological Dispatches */}
              <aside
                aria-label="Latest Newsroom Wire"
                className="lg:col-span-3 lg:pl-7 min-w-0"
              >
                <div className="pb-2 border-b-2 border-[#22577A] flex items-center justify-between">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#14171A] m-0">
                    Latest Wire
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8E2A3B]">
                    2025–2026
                  </span>
                </div>

                <div className="divide-y divide-slate-200">
                  {wireLayout.latestWire.map((article, idx) => (
                    <article key={`wire-${article.id}`} className="py-3.5">
                      <button
                        type="button"
                        onClick={() => setActiveArticle(article)}
                        className="group w-full flex items-start justify-between gap-3 text-left bg-transparent border-0 p-0 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8E2A3B] tabular-nums">
                            <span className="text-slate-400">
                              0{idx + 1}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{article.category}</span>
                          </div>
                          <h3 className="mt-0.5 text-[13px] font-bold text-[#14171A] group-hover:text-[#22577A] leading-snug m-0 transition-colors">
                            {article.title}
                          </h3>
                          <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                            {article.date}
                          </div>
                        </div>

                        <div className="w-[70px] h-[52px] rounded-md bg-slate-100 overflow-hidden shrink-0">
                          <img
                            src={article.image}
                            alt={article.title}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 block"
                          />
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            </section>

            {/* LOWER CATEGORIZED 4-COLUMN PRESS DEPARTMENT BANDS */}
            {wireLayout.departmentSections.map((section) => (
              <section
                key={section.category}
                aria-label={`${section.category} Bulletins`}
                className="pt-2"
              >
                <div className="flex items-center justify-between bg-[#F8FAFC] px-4 py-2.5 border-y border-slate-200 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#14171A]">
                      {DEPARTMENT_TITLES[section.category]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(section.category);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-[11.5px] font-bold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    View all »
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                  {section.articles.map((article) => (
                    <article
                      key={article.id}
                      className="flex flex-col border-b border-slate-100 pb-4"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveArticle(article)}
                        aria-label={`Read press brief: ${article.title}`}
                        className="group w-full aspect-[16/10] rounded-lg bg-slate-100 overflow-hidden border-0 p-0 cursor-pointer block"
                      >
                        <img
                          src={article.image}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 block"
                        />
                      </button>

                      <div className="pt-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em]">
                          <span className="text-[#8E2A3B]">
                            {article.category}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            {article.date}
                          </span>
                        </div>

                        <h3 className="mt-1.5 text-[15.5px] font-bold text-[#14171A] leading-snug m-0">
                          <button
                            type="button"
                            onClick={() => setActiveArticle(article)}
                            className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                          >
                            {article.title}
                          </button>
                        </h3>

                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5F6672] line-clamp-2 mb-2.5">
                          {article.summary}
                        </p>

                        <div className="flex items-start gap-1.5 text-[11px] text-slate-600 mb-3">
                          <FiCheckCircle className="text-[#3393B8] shrink-0 mt-0.5 text-[11px]" />
                          <span className="line-clamp-1">
                            {article.highlights[0]}
                          </span>
                        </div>

                        <div className="mt-auto pt-2 flex items-center justify-between text-[11.5px]">
                          <button
                            type="button"
                            onClick={() => setActiveArticle(article)}
                            className="font-bold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                          >
                            Read Brief
                          </button>
                          <Link
                            to={article.ctaTo}
                            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-[#22577A] no-underline"
                          >
                            <span>{article.ctaLabel}</span>
                            <FiArrowRight className="text-[10px]" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Newsroom Cross-Navigation Footer Strip */}
        <section
          aria-label="Explore Technical Resources & Blogs"
          className="mt-14 rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-lg font-bold text-[#14171A] m-0">
              Explore Architectural Journal &amp; Technical Specifications
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6672] mt-1 mb-0">
              Switch to our Blogger-connected monograph journal for long-form facade studies, or download CAD packs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/resources"
              className="min-h-[40px] inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-xs font-bold text-[#14171A] no-underline transition-colors"
            >
              Resources &amp; CAD
            </Link>
            <Link
              to="/blogs"
              className="min-h-[40px] inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-xs font-bold text-[#8E2A3B] no-underline transition-colors"
            >
              Architectural Blogs
            </Link>
            <Link
              to="/contact"
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold no-underline transition-colors"
            >
              <span>Contact Estimation Desk</span>
              <FiArrowRight className="text-xs" />
            </Link>
          </div>
        </section>
      </main>

      <PageAdBannerSlideshow pageKey="news" />

      {/* Press Brief Modal */}
      <Modal
        open={Boolean(activeArticle)}
        onCancel={() => setActiveArticle(null)}
        footer={null}
        centered
        width={640}
        destroyOnHidden
        title={
          activeArticle ? (
            <div className="pr-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8E2A3B]">
                {activeArticle.category} · {activeArticle.date}
              </div>
              <div className="text-lg font-extrabold text-[#14171A] mt-0.5 leading-snug">
                {activeArticle.title}
              </div>
            </div>
          ) : null
        }
      >
        {activeArticle && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg overflow-hidden aspect-[16/9] bg-slate-100">
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                className="w-full h-full object-cover block"
              />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed m-0">
              {activeArticle.summary}
            </p>
            <ul className="list-none p-0 m-0 space-y-2 border-y border-slate-100 py-3">
              {activeArticle.highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-2 text-xs text-slate-700"
                >
                  <FiCheckCircle className="text-[#3393B8] shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <div className="pt-1 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="min-h-[38px] px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer bg-white"
              >
                Close
              </button>
              <Link
                to={activeArticle.ctaTo}
                onClick={() => setActiveArticle(null)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-semibold no-underline"
              >
                <span>{activeArticle.ctaLabel}</span>
                <FiArrowRight className="text-xs" />
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
