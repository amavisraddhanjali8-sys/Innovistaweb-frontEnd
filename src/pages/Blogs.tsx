import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Modal, Spin } from "antd";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiClock,
  FiExternalLink,
  FiRefreshCw,
  FiSearch,
  FiShare2,
  FiSliders,
  FiUser,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import PageMetadata from "../components/PageMetadata";
import RequestQuoteButton from "../components/RequestQuoteButton";
import {
  BLOGGER_COVER_FALLBACKS,
  DEFAULT_BLOGGER_CONFIG,
  DEFAULT_BLOG_POSTS,
  buildBlogEditorialLayout,
  filterBlogPosts,
  getBlogCategories,
  sanitizeBlogHtml,
  type BlogPostItem,
  type BloggerConnectionConfig,
} from "../utils/blogBloggerHelpers";

type SourceFilter = "all" | "blogger" | "local";

const SERIF_FONT = { fontFamily: "'Newsreader', Georgia, serif" };
const SANS_FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

function BlogImageWithFallback({
  src,
  alt,
  className,
  fallbackIdx = 0,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackIdx?: number;
  eager?: boolean;
}) {
  const fallbackSrc =
    BLOGGER_COVER_FALLBACKS[fallbackIdx % BLOGGER_COVER_FALLBACKS.length];
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="eager"
      decoding="async"
      onError={() => {
        if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
      }}
      className={className}
    />
  );
}

export default function Blogs() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogPostItem[]>(DEFAULT_BLOG_POSTS);
  const [bloggerConfig, setBloggerConfig] = useState<BloggerConnectionConfig>(
    DEFAULT_BLOGGER_CONFIG
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeArticle, setActiveArticle] = useState<BlogPostItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadBlogs = useCallback(async (forceSync = false) => {
    try {
      if (forceSync) setSyncing(true);
      else setLoading(true);

      const res = await AxiosConfig.get<{
        posts?: BlogPostItem[];
        data?: BlogPostItem[];
        config?: BloggerConnectionConfig;
      }>("/api/blogs", {
        params: forceSync ? { forceSync: 1 } : { autoSync: 1 },
      });

      const fetchedPosts = Array.isArray(res.data?.posts)
        ? res.data.posts
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      if (fetchedPosts.length > 0) {
        setPosts(fetchedPosts);
      }
      if (res.data?.config) {
        setBloggerConfig(res.data.config);
      }
    } catch {
      // Keep local defaults smoothly if backend is unreachable
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadBlogs(false);
  }, [loadBlogs]);

  // Deep link via /blogs?post=<id>
  useEffect(() => {
    const requestedId = searchParams.get("post");
    if (!requestedId || posts.length === 0) return;
    const match = posts.find(
      (p) => p.id === requestedId || p.externalId === requestedId
    );
    if (match) {
      setActiveArticle(match);
    }
  }, [searchParams, posts]);

  const openArticleReader = (article: BlogPostItem) => {
    setActiveArticle(article);
    setSearchParams({ post: article.id }, { replace: true });
  };

  const closeArticleReader = () => {
    setActiveArticle(null);
    if (searchParams.has("post")) {
      searchParams.delete("post");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleSharePost = async (article: BlogPostItem) => {
    const shareUrl =
      article.bloggerUrl ||
      `${window.location.origin}/#/blogs?post=${encodeURIComponent(article.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Clipboard fallback below
    }
    setCopiedId(article.id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === article.id ? null : prev));
    }, 2200);
  };

  const categories = useMemo(() => getBlogCategories(posts), [posts]);
  const bloggerCount = useMemo(
    () => posts.filter((p) => p.source === "blogger").length,
    [posts]
  );

  const visiblePosts = useMemo(
    () => filterBlogPosts(posts, selectedCategory, searchQuery, sourceFilter),
    [posts, selectedCategory, searchQuery, sourceFilter]
  );

  const editorial = useMemo(
    () => buildBlogEditorialLayout(visiblePosts, posts),
    [visiblePosts, posts]
  );

  const isFilteredView =
    selectedCategory !== "All" ||
    sourceFilter !== "all" ||
    searchQuery.trim().length > 0;

  return (
    <div
      style={SANS_FONT}
      className="w-full bg-[#FCFAF6] text-[#181715] flex flex-col"
    >
      <PageMetadata
        title={
          activeArticle
            ? activeArticle.title
            : "Architectural Journal, Essays & Facade Notes"
        }
        description={
          activeArticle
            ? activeArticle.excerpt
            : "Read architectural aluminium facade engineering studies, thermal glazing insights, and fabrication notes from Innovista Fabriconix."
        }
        canonicalPath={
          activeArticle ? `/blogs?post=${activeArticle.id}` : "/blogs"
        }
        ogType={activeArticle ? "article" : "website"}
        ogImage={activeArticle?.coverImage}
      />
      {/* Editorial Monograph Masthead & Blogger.com Integration Strip */}
      <header className="w-full border-b border-[#E4DDD0] bg-[#FCFAF6]">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#22577A]">
                <span>Innovista Architectural Journal</span>
                <span aria-hidden="true" className="text-[#C7BFAF]">
                  /
                </span>
                <span className="text-[#8E2A3B]">
                  {bloggerConfig.blogUrl
                    ? `Blogger.com Live · ${bloggerConfig.blogTitle}`
                    : "Blogger.com Ready Edition"}
                </span>
              </div>
              <h1
                style={SERIF_FONT}
                className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-[#181715] leading-[1.08] mt-1.5 mb-0"
              >
                Essays, Facade Notes &amp; Craft Studies
              </h1>
            </div>

            {/* Utility Strip: Blogger Refresh + Admin CMS + Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {bloggerConfig.blogUrl && (
                <button
                  type="button"
                  onClick={() => loadBlogs(true)}
                  disabled={syncing}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D8D0C2] bg-white hover:border-[#22577A] text-xs font-semibold text-[#22577A] cursor-pointer transition-colors disabled:opacity-60"
                >
                  <FiRefreshCw
                    className={`text-xs ${syncing ? "animate-spin" : ""}`}
                  />
                  <span>{syncing ? "Syncing..." : "Sync Blogger.com"}</span>
                </button>
              )}

              {user?.role === "admin" && (
                <Link
                  to="/BlogsAdmin"
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D8D0C2] bg-white hover:border-[#22577A] text-xs font-semibold text-[#181715] hover:text-[#22577A] no-underline transition-colors"
                >
                  <FiSliders className="text-xs text-[#22577A]" />
                  <span>Manage &amp; Home Blogs</span>
                </Link>
              )}

              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C] text-xs" />
                <input
                  type="search"
                  aria-label="Search journal essays"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search essays or topics..."
                  className="w-full min-h-[40px] pl-8 pr-7 py-1.5 border border-[#D8D0C2] bg-white text-xs text-[#181715] placeholder:text-[#8C857B] focus:outline-none focus:border-[#22577A]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#181715] bg-transparent border-0 p-1 cursor-pointer"
                  >
                    <FiX className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hairline Category & Source Index Strip (Zero-Pill Typography) */}
          <div className="pt-3 border-t border-[#E4DDD0] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <nav
              aria-label="Journal topic sections"
              className="flex items-center gap-5 overflow-x-auto pb-1 md:pb-0 no-scrollbar"
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedCategory(cat)}
                    className={`relative pb-1.5 text-xs font-semibold tracking-wide whitespace-nowrap bg-transparent border-0 border-b-2 transition-colors cursor-pointer px-0 ${
                      isActive
                        ? "border-[#22577A] text-[#181715]"
                        : "border-transparent text-[#6E675F] hover:text-[#22577A]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-4 text-xs text-[#6E675F] shrink-0">
              {bloggerCount > 0 && (
                <div
                  role="group"
                  aria-label="Filter blog publication source"
                  className="flex items-center gap-3"
                >
                  {(
                    [
                      { key: "all", label: `All (${posts.length})` },
                      { key: "blogger", label: `Blogger (${bloggerCount})` },
                      {
                        key: "local",
                        label: `Journal (${posts.length - bloggerCount})`,
                      },
                    ] as Array<{ key: SourceFilter; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSourceFilter(opt.key)}
                      className={`text-xs font-semibold bg-transparent border-0 p-0 cursor-pointer transition-colors ${
                        sourceFilter === opt.key
                          ? "text-[#8E2A3B] underline underline-offset-4"
                          : "text-[#6E675F] hover:text-[#181715]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              <Link
                to="/news"
                className="text-xs font-semibold text-[#22577A] hover:underline no-underline whitespace-nowrap"
              >
                Press Newsroom »
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Editorial Canvas */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Spin size="large" />
            <span className="text-xs font-medium text-[#6E675F]">
              Loading architectural journal &amp; Blogger.com feed...
            </span>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="border border-[#E4DDD0] bg-white py-16 px-6 text-center max-w-lg mx-auto">
            <h2
              style={SERIF_FONT}
              className="text-2xl font-bold text-[#181715] m-0"
            >
              No matching essays found
            </h2>
            <p className="text-xs sm:text-sm text-[#6E675F] mt-2 mb-5">
              Adjust your topic selection or search terms to browse the full architectural publication.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("All");
                setSourceFilter("all");
                setSearchQuery("");
              }}
              className="min-h-[42px] px-5 py-2 bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-semibold cursor-pointer border-0"
            >
              Reset Journal View
            </button>
          </div>
        ) : isFilteredView ? (
          /* Focused 4-Column Archive View when a user clicks View all » or searches */
          <section aria-label="Filtered Journal Essays">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-7 border-b border-[#181715]/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    setSourceFilter("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  <FiArrowLeft className="text-xs" />
                  <span>All Sections</span>
                </button>
                <span aria-hidden="true" className="text-[#C7BFAF]">
                  /
                </span>
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#181715] m-0">
                  {selectedCategory !== "All" ? selectedCategory : "Search Results"} (
                  {visiblePosts.length})
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {visiblePosts.map((post, idx) => (
                <article key={post.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => openArticleReader(post)}
                    aria-label={`Read essay: ${post.title}`}
                    className="group w-full aspect-[16/10] bg-[#ECE6DB] overflow-hidden border-0 p-0 cursor-pointer block"
                  >
                    <BlogImageWithFallback
                      src={post.coverImage}
                      alt={post.title}
                      fallbackIdx={idx}
                      eager={idx < 4}
                      className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 block"
                    />
                  </button>

                  <div className="pt-3 flex-1 flex flex-col">
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#22577A]">
                      <span>{post.category}</span>
                      {post.source === "blogger" && (
                        <span className="text-[#8E2A3B]">Blogger</span>
                      )}
                    </div>

                    <h3
                      style={SERIF_FONT}
                      className="mt-1.5 text-[18px] font-bold text-[#181715] leading-[1.24] m-0"
                    >
                      <button
                        type="button"
                        onClick={() => openArticleReader(post)}
                        className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                      >
                        {post.title}
                      </button>
                    </h3>

                    <div className="mt-1.5 text-[11px] text-[#78716C] tabular-nums">
                      {post.date} · {post.readTime}
                    </div>

                    <p className="mt-2 text-[12.5px] leading-relaxed text-[#57534E] line-clamp-3 mb-3">
                      {post.excerpt}
                    </p>

                    <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => openArticleReader(post)}
                        className="font-semibold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Read Essay →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSharePost(post)}
                        aria-label={`Share ${post.title}`}
                        className="inline-flex items-center gap-1 text-[#6E675F] hover:text-[#181715] bg-transparent border-0 p-0 cursor-pointer"
                      >
                        {copiedId === post.id ? (
                          <>
                            <FiCheck className="text-emerald-700" />
                            <span className="text-emerald-700 font-semibold">
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <FiShare2 className="text-[11px]" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          /* Editorial Front-Page Layout (Reference-Inspired 3-Col Hero + 4-Col Category Rows) */
          <div className="space-y-12">
            {/* TOP 3-COLUMN ASYMMETRIC SPLIT */}
            <section
              aria-label="Featured Front Page Essays"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 lg:divide-x lg:divide-[#E4DDD0]"
            >
              {/* Left Column (~23%): 2 Stacked Secondary Features */}
              <div className="lg:col-span-3 lg:pr-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-0 lg:divide-y lg:divide-[#E4DDD0] min-w-0">
                {editorial.leftColumn.map((post, idx) => (
                  <article
                    key={post.id}
                    className={idx > 0 ? "lg:pt-6" : "lg:pb-6"}
                  >
                    <button
                      type="button"
                      onClick={() => openArticleReader(post)}
                      aria-label={`Read essay: ${post.title}`}
                      className="group w-full aspect-[16/10] bg-[#ECE6DB] overflow-hidden border-0 p-0 cursor-pointer block"
                    >
                      <BlogImageWithFallback
                        src={post.coverImage}
                        alt={post.title}
                        fallbackIdx={idx + 1}
                        eager
                        className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 block"
                      />
                    </button>

                    <div className="pt-3">
                      <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#22577A]">
                        <span>{post.category}</span>
                        {post.source === "blogger" && (
                          <span className="text-[#8E2A3B]">Blogger</span>
                        )}
                      </div>

                      <h2
                        style={SERIF_FONT}
                        className="mt-1 text-[17.5px] font-bold text-[#181715] leading-[1.24] m-0"
                      >
                        <button
                          type="button"
                          onClick={() => openArticleReader(post)}
                          className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                        >
                          {post.title}
                        </button>
                      </h2>

                      <div className="mt-1.5 text-[11px] text-[#78716C] tabular-nums">
                        {post.date} · {post.readTime}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Center Column (~52%): Dominant Lead Essay (Appears first on mobile!) */}
              {editorial.centerLead && (
                <div className="order-first lg:order-none lg:col-span-6 lg:px-8 min-w-0">
                  <article className="flex flex-col items-center text-center">
                    <button
                      type="button"
                      onClick={() => openArticleReader(editorial.centerLead!)}
                      aria-label={`Open lead essay: ${editorial.centerLead.title}`}
                      className="group w-full aspect-[16/10] max-h-[460px] bg-[#ECE6DB] overflow-hidden border-0 p-0 cursor-pointer block"
                    >
                      <BlogImageWithFallback
                        src={editorial.centerLead.coverImage}
                        alt={editorial.centerLead.title}
                        fallbackIdx={0}
                        eager
                        className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500 block"
                      />
                    </button>

                    <div className="pt-5 max-w-xl mx-auto">
                      <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#22577A]">
                        <span>{editorial.centerLead.category}</span>
                        {editorial.centerLead.source === "blogger" && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#8E2A3B]">Blogger.com</span>
                          </>
                        )}
                      </div>

                      <h2
                        style={SERIF_FONT}
                        className="mt-2 text-2xl sm:text-3xl lg:text-[2.2rem] font-bold text-[#181715] leading-[1.15] tracking-tight m-0 text-balance"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openArticleReader(editorial.centerLead!)
                          }
                          className="bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                        >
                          {editorial.centerLead.title}
                        </button>
                      </h2>

                      <p className="mt-3 text-[13.5px] sm:text-[14.5px] text-[#57534E] leading-relaxed m-0">
                        {editorial.centerLead.excerpt}
                      </p>

                      <div className="mt-3.5 text-[11.5px] text-[#78716C] tabular-nums">
                        {editorial.centerLead.date} ·{" "}
                        <strong className="font-semibold text-[#181715]">
                          {editorial.centerLead.author}
                        </strong>{" "}
                        · {editorial.centerLead.readTime}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            openArticleReader(editorial.centerLead!)
                          }
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-semibold cursor-pointer border-0 transition-colors"
                        >
                          <FiBookOpen className="text-xs" />
                          <span>Read Full Essay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSharePost(editorial.centerLead!)}
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D8D0C2] bg-white hover:border-[#22577A] text-xs font-semibold text-[#181715] cursor-pointer transition-colors"
                        >
                          {copiedId === editorial.centerLead.id ? (
                            <>
                              <FiCheck className="text-emerald-700" />
                              <span className="text-emerald-700">
                                Link Copied
                              </span>
                            </>
                          ) : (
                            <>
                              <FiShare2 className="text-xs text-[#22577A]" />
                              <span>Share Essay</span>
                            </>
                          )}
                        </button>

                        {editorial.centerLead.bloggerUrl && (
                          <a
                            href={editorial.centerLead.bloggerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[40px] inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#8E2A3B] hover:underline no-underline"
                          >
                            <span>Blogger</span>
                            <FiExternalLink className="text-[11px]" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              )}

              {/* Right Column (~25%): LATEST ESSAYS Thumbnail Rail */}
              <aside
                aria-label="Latest Journal Essays"
                className="lg:col-span-3 lg:pl-7 min-w-0"
              >
                <div className="pb-2 border-b border-[#181715]/80 flex items-center justify-between">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#181715] m-0">
                    Latest Essays
                  </h2>
                  {bloggerCount > 0 && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8E2A3B]">
                      +{bloggerCount} Blogger
                    </span>
                  )}
                </div>

                <div className="divide-y divide-[#E4DDD0]">
                  {editorial.latestRail.map((post, idx) => (
                    <article key={`latest-${post.id}`} className="py-3.5">
                      <button
                        type="button"
                        onClick={() => openArticleReader(post)}
                        className="group w-full flex items-start justify-between gap-3.5 text-left bg-transparent border-0 p-0 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <h3
                            style={SERIF_FONT}
                            className="text-[14px] font-bold text-[#181715] group-hover:text-[#22577A] leading-[1.28] m-0 transition-colors"
                          >
                            {post.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#78716C] tabular-nums">
                            <span>{post.date}</span>
                            {post.source === "blogger" && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[#8E2A3B]">
                                  Blogger
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="w-[78px] h-[56px] bg-[#ECE6DB] overflow-hidden shrink-0">
                          <BlogImageWithFallback
                            src={post.coverImage}
                            alt={post.title}
                            fallbackIdx={idx + 2}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 block"
                          />
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            </section>

            {/* LOWER CATEGORIZED 4-COLUMN EDITORIAL ROWS */}
            {editorial.categorySections.map((section, sIdx) => (
              <section
                key={section.category}
                aria-label={`${section.category} Essays`}
                className="pt-8 border-t border-[#E4DDD0]"
              >
                <div className="flex items-center justify-between pb-2.5 mb-6 border-b border-[#D8D0C2]">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#181715] m-0">
                    {section.category}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (section.sourceFilter === "blogger") {
                        setSourceFilter("blogger");
                        setSelectedCategory("All");
                      } else {
                        setSelectedCategory(section.filterKey);
                      }
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-[11.5px] font-semibold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    View all »
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                  {section.posts.map((post, idx) => (
                    <article key={post.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => openArticleReader(post)}
                        aria-label={`Read essay: ${post.title}`}
                        className="group w-full aspect-[16/10] bg-[#ECE6DB] overflow-hidden border-0 p-0 cursor-pointer block"
                      >
                        <BlogImageWithFallback
                          src={post.coverImage}
                          alt={post.title}
                          fallbackIdx={sIdx * 4 + idx}
                          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 block"
                        />
                      </button>

                      <div className="pt-3 flex-1 flex flex-col">
                        <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#22577A]">
                          <span>{post.category}</span>
                          {post.labels && post.labels[1] && (
                            <span className="text-[#6E675F] font-semibold">
                              {post.labels[1]}
                            </span>
                          )}
                          {post.source === "blogger" && (
                            <span className="text-[#8E2A3B]">Blogger</span>
                          )}
                        </div>

                        <h3
                          style={SERIF_FONT}
                          className="mt-1.5 text-[17.5px] font-bold text-[#181715] leading-[1.24] m-0"
                        >
                          <button
                            type="button"
                            onClick={() => openArticleReader(post)}
                            className="text-left bg-transparent border-0 p-0 font-inherit text-inherit hover:text-[#22577A] transition-colors cursor-pointer"
                          >
                            {post.title}
                          </button>
                        </h3>

                        <div className="mt-1.5 text-[11px] text-[#78716C] tabular-nums">
                          {post.date}
                        </div>

                        <p className="mt-2 text-[12.5px] leading-relaxed text-[#57534E] line-clamp-3 mb-3">
                          {post.excerpt}
                        </p>

                        <div className="mt-auto pt-2 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => openArticleReader(post)}
                            className="font-semibold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                          >
                            Read Essay →
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSharePost(post)}
                            aria-label={`Share ${post.title}`}
                            className="inline-flex items-center gap-1 text-[#6E675F] hover:text-[#181715] bg-transparent border-0 p-0 cursor-pointer"
                          >
                            {copiedId === post.id ? (
                              <>
                                <FiCheck className="text-emerald-700" />
                                <span className="text-emerald-700 font-semibold">
                                  Copied
                                </span>
                              </>
                            ) : (
                              <>
                                <FiShare2 className="text-[11px]" />
                                <span>Share</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Quiet Editorial Bridge Strip (Blogger Publication + Quote CTA) */}
        <section
          aria-label="Journal & Blogger Publication Notes"
          className="mt-14 pt-7 border-t border-[#E4DDD0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8E2A3B]">
              {bloggerConfig.blogUrl
                ? `Connected Blogger Feed · ${bloggerConfig.blogTitle}`
                : "Blogger.com Auto-Share Ready"}
            </div>
            <h2
              style={SERIF_FONT}
              className="mt-1 text-xl font-bold text-[#181715] m-0"
            >
              Publish on Blogger.com, Curate for the Home Showcase
            </h2>
            <p className="text-xs sm:text-sm text-[#57534E] mt-1 mb-0">
              Every article synced from Blogger.com appears here automatically and can be pinned to the landing page showcase from Admin. Looking for product releases or ISO audits? Visit our press wire.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/news"
              className="min-h-[40px] inline-flex items-center px-4 py-2 border border-[#D8D0C2] bg-white hover:border-[#22577A] text-xs font-semibold text-[#181715] no-underline transition-colors"
            >
              Open Press Newsroom
            </Link>
            <RequestQuoteButton as="link" to="/request-quote" size="sm">
              <span>Request Project Quote</span>
              <FiArrowRight className="text-xs" />
            </RequestQuoteButton>
          </div>
        </section>
      </main>

      <PageAdBannerSlideshow pageKey="blogs" />

      {/* Monograph Essay Reader Modal */}
      <Modal
        open={Boolean(activeArticle)}
        onCancel={closeArticleReader}
        footer={null}
        centered
        width={780}
        destroyOnHidden
        title={
          activeArticle ? (
            <div className="pr-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#22577A]">
                <span>{activeArticle.category}</span>
                {activeArticle.source === "blogger" && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#8E2A3B]">Blogger.com</span>
                  </>
                )}
              </div>
              <div
                style={SERIF_FONT}
                className="text-xl sm:text-2xl font-bold text-[#181715] mt-1 leading-snug"
              >
                {activeArticle.title}
              </div>
            </div>
          ) : null
        }
      >
        {activeArticle && (
          <div className="space-y-5 pt-2">
            <div className="overflow-hidden aspect-[16/9] bg-[#ECE6DB]">
              <BlogImageWithFallback
                src={activeArticle.coverImage}
                alt={activeArticle.title}
                eager
                className="w-full h-full object-cover block"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs text-[#6E675F]">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#181715]">
                  <FiUser className="text-[#22577A]" />
                  {activeArticle.author}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <FiCalendar className="text-[#78716C]" />
                  {activeArticle.date}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <FiClock className="text-[#78716C]" />
                  {activeArticle.readTime}
                </span>
              </div>

              {activeArticle.labels && activeArticle.labels.length > 0 && (
                <div className="text-[11px] font-medium text-[#78716C]">
                  {activeArticle.labels.slice(0, 3).join(" · ")}
                </div>
              )}
            </div>

            <div
              className="max-w-2xl mx-auto text-sm sm:text-[15.5px] text-[#292524] leading-[1.78] space-y-3.5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#181715] [&_h2]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#181715] [&_h3]:mt-4 [&_p]:m-0 [&>p:first-of-type]:first-letter:text-4xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-2.5 [&>p:first-of-type]:first-letter:leading-none [&_img]:max-w-full [&_a]:text-[#22577A] [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html: sanitizeBlogHtml(activeArticle.contentHtml),
              }}
            />

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#6E675F]">
                {activeArticle.source === "blogger"
                  ? "Synced & shared automatically from Blogger.com"
                  : "Published in Innovista Architectural Journal"}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSharePost(activeArticle)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:border-[#22577A] text-xs font-semibold text-[#181715] cursor-pointer"
                >
                  {copiedId === activeArticle.id ? (
                    <>
                      <FiCheck className="text-emerald-700" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <FiShare2 className="text-xs" />
                      <span>Copy Share Link</span>
                    </>
                  )}
                </button>
                {activeArticle.bloggerUrl && (
                  <a
                    href={activeArticle.bloggerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:border-[#22577A] text-xs font-semibold text-[#22577A] no-underline"
                  >
                    <span>Open on Blogger.com</span>
                    <FiExternalLink className="text-xs" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={closeArticleReader}
                  className="min-h-[38px] px-4 py-2 bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-semibold cursor-pointer border-0"
                >
                  Close Essay
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
