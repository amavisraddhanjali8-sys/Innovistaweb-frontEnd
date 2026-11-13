import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "antd";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiSearch,
  FiX,
} from "react-icons/fi";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import type { HeroSlide } from "../utils/aboutContentHelpers";
import {
  NEWS_ARTICLES,
  NEWS_CATEGORIES,
  filterNewsArticles,
  type NewsArticleItem,
  type NewsCategory,
} from "../utils/siteContentHelpers";

const NEWS_HERO_SLIDES: HeroSlide[] = [
  {
    id: "news-hero-1",
    headline: "Company News & Releases",
    subheadline: "Latest product launches, completed landmarks, and quality audits.",
    image: "/assets/about/facade.jpg",
  },
  {
    id: "news-hero-2",
    headline: "Coastal Engineering Updates",
    subheadline: "Precision thermal aluminium doors and certified glazing milestones.",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "news-hero-3",
    headline: "Showroom & Hardware Stock",
    subheadline: "Expanded European stainless-steel fittings ready in Colombo.",
    image: "/assets/products/hero-showroom.jpg",
  },
];

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

  return (
    <div className="w-full bg-white flex flex-col">
      <ShowcaseHeroSlideshow
        slides={NEWS_HERO_SLIDES}
        slideshowSpeedMs={5000}
        ariaLabel="Newsroom highlights"
        eyebrowText="Newsroom"
      />

      <section className="w-full bg-white py-10 sm:py-12">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-10">
          <AboutTaglineHeading
            kicker="Latest Briefs"
            heading="News & Announcements"
            tagline="Short updates on releases, completed builds, and certifications."
            align="center"
          />

          {/* Simple Filter Bar */}
          <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 sm:p-4">
            <div
              role="group"
              aria-label="Filter news by category"
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-[#3393B8] hover:text-[#22577A]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="search"
                aria-label="Search news"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search updates..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#3393B8]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear news search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-0 p-1 cursor-pointer"
                >
                  <FiX className="text-xs" />
                </button>
              )}
            </div>
          </div>

          {visibleArticles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] py-12 px-6 text-center max-w-md mx-auto">
              <h3 className="text-base font-bold text-[#14171A] m-0">
                No updates found
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Clear filters to view all company news.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold cursor-pointer"
              >
                Show All News
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleArticles.map((article) => (
                <article
                  key={article.id}
                  className="group rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col hover:border-[#3393B8]/60 hover:shadow-[0_18px_40px_-15px_rgba(15,23,42,0.10)] transition-all"
                >
                  <button
                    type="button"
                    aria-label={`Read ${article.title}`}
                    onClick={() => setActiveArticle(article)}
                    className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 border-0 p-0 cursor-pointer block"
                  >
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 text-[#22577A] text-[11px] font-semibold shadow-xs">
                      {article.category}
                    </span>
                  </button>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-2">
                      <FiCalendar className="text-[#3393B8]" />
                      <span>{article.date}</span>
                    </div>

                    <h3
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="text-[17px] font-bold text-[#14171A] leading-snug tracking-tight m-0"
                    >
                      {article.title}
                    </h3>

                    <p className="mt-2 text-[13px] leading-relaxed text-[#5F6672] line-clamp-2 mb-4">
                      {article.summary}
                    </p>

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveArticle(article)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer transition-all"
                      >
                        Read Brief
                      </button>

                      <Link
                        to={article.ctaTo}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#22577A] hover:underline no-underline"
                      >
                        <span>{article.ctaLabel}</span>
                        <FiArrowRight className="text-xs" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Cross-Page Quick Links */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-lg font-bold text-[#14171A] m-0"
              >
                Explore Technical Guides &amp; Direct Support
              </h3>
              <p className="text-xs sm:text-sm text-[#5F6672] mt-1 mb-0">
                Download spec packs, read engineering articles, or message our team.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to="/resources"
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline transition-colors"
              >
                Resources &amp; FAQs
              </Link>
              <Link
                to="/blogs"
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline transition-colors"
              >
                All Blogs
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold no-underline shadow-sm"
              >
                <span>Contact Us</span>
                <FiArrowRight className="text-xs" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brief Detail Modal */}
      <Modal
        open={Boolean(activeArticle)}
        onCancel={() => setActiveArticle(null)}
        footer={null}
        centered
        width={600}
        title={
          activeArticle ? (
            <span className="text-base font-bold text-[#14171A]">
              {activeArticle.title}
            </span>
          ) : null
        }
      >
        {activeArticle && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl overflow-hidden aspect-[16/9] bg-slate-100">
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                className="w-full h-full object-cover block"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#22577A]">
                {activeArticle.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeArticle.date}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed m-0">
              {activeArticle.summary}
            </p>
            <ul className="list-none p-0 m-0 space-y-2">
              {activeArticle.highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-center gap-2 text-xs text-slate-600"
                >
                  <FiCheckCircle className="text-[#3393B8] shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer bg-white"
              >
                Close
              </button>
              <Link
                to={activeArticle.ctaTo}
                onClick={() => setActiveArticle(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold no-underline"
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
