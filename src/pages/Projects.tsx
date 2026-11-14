import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pagination, Spin, message } from "antd";
import {
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiMail,
  FiMapPin,
  FiSearch,
  FiSend,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import PageMetadata from "../components/PageMetadata";
import RequestQuoteModal from "../components/RequestQuoteModal";
import { SafeImageGalleryModal } from "../components/SafeImage";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import { formatCurrencyLkr } from "../utils/adminPortalHelpers";
import {
  buildProjectHeroSlides,
  computeProjectPortfolioMetrics,
  filterProjects,
  formatProjectDuration,
  getProjectStatus,
  normalizeProjectImages,
  type ProjectShowcaseItem,
  type ProjectStatusFilter,
} from "../utils/projectShowcaseHelpers";

const STATUS_TABS: Array<{ key: ProjectStatusFilter; label: string }> = [
  { key: "all", label: "All Projects" },
  { key: "completed", label: "Completed" },
  { key: "ongoing", label: "Ongoing" },
];

function Projects() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectShowcaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & pagination state
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Gallery lightbox state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("Project Gallery");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Quote modal state
  const [quoteProjectTitle, setQuoteProjectTitle] = useState<string | null>(null);

  const handleRequestQuote = (projectTitle: string) => {
    if (!isLoggedIn) {
      message.info("Please create a customer account to request a quotation.");
      navigate(
        buildSignupRedirectUrl(`${location.pathname}${location.search}`, "quote")
      );
      return;
    }
    setQuoteProjectTitle(projectTitle);
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AxiosConfig.get("/projects/getAllProjects", {
        params: { page: 1, limit: 100 },
      });
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      setProjects(list);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const metrics = useMemo(
    () => computeProjectPortfolioMetrics(projects),
    [projects]
  );

  const heroSlides = useMemo(
    () => buildProjectHeroSlides(projects),
    [projects]
  );

  const filteredProjects = useMemo(
    () => filterProjects(projects, statusFilter, searchQuery),
    [projects, statusFilter, searchQuery]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const openPreview = (project: ProjectShowcaseItem, index = 0) => {
    setPreviewTitle(project.Project_Title);
    setPreviewImages(normalizeProjectImages(project.Project_Images));
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  return (
    <div className="w-full bg-white flex flex-col">
      <PageMetadata
        title="Architectural Projects Portfolio | Innovista Fabriconix"
        description="Browse completed and ongoing luxury residential villas, commercial curtain walls, and corporate acoustic glazing commissions by Innovista Fabriconix."
        canonicalPath="/projects"
        ogImage={heroSlides[0]?.image || "/assets/about/pavilion.jpg"}
      />
      <SafeImageGalleryModal
        title={previewTitle}
        images={previewImages}
        open={previewVisible}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewVisible(false)}
      />

      <RequestQuoteModal
        open={quoteProjectTitle !== null}
        onClose={() => setQuoteProjectTitle(null)}
        productName={quoteProjectTitle || "Architectural Glazing Project"}
        categoryName="Project Consultation"
        defaultInquiryType="Custom Site Fabrication"
      />

      <PageAdBannerSlideshow pageKey="projects" />

      {/* Top Hero Banner matching About Page aesthetic */}
      <ShowcaseHeroSlideshow
        slides={heroSlides}
        slideshowSpeedMs={5000}
        ariaLabel="Featured architectural projects slideshow"
        eyebrowText="Portfolio Showcase"
        adminManageTo="/AddProjects"
        adminManageLabel="Manage Projects"
      />

      {/* Portfolio Metrics Strip matching VisionSection architectural pillars */}
      <section className="w-full bg-white py-6 sm:py-8">
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22577A]/80">
                Delivered Works
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-bold text-[#14171A] tabular-nums">
                {metrics.completedCount}
                <span className="text-sm font-medium text-slate-500 ml-1">
                  / {metrics.totalProjects}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 m-0">
                Certified handover sites
              </p>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22577A]/80">
                Active Sites
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-bold text-[#14171A] tabular-nums">
                {metrics.ongoingCount}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 m-0">
                Currently in fabrication
              </p>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22577A]/80">
                Regions Served
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-bold text-[#14171A] tabular-nums">
                {metrics.uniqueLocationsCount}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 m-0">
                Island-wide project reach
              </p>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22577A]/80">
                Portfolio Value
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-bold text-[#22577A] tabular-nums truncate">
                {formatCurrencyLkr(metrics.totalBudget)}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 m-0">
                Combined aluminium &amp; glass scope
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Signature Installations Section */}
      <section className="w-full bg-white pb-12 sm:pb-16">
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Proven Delivery"
            heading="Signature Installations"
            tagline="Engineered aluminium facades, sliding systems, and acoustic glazing delivered on schedule across residential and commercial developments."
            align="center"
          />

          {/* Clean Search & Status Filter Bar */}
          <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 sm:p-4">
            <div
              role="group"
              aria-label="Filter projects by status"
              className="flex flex-wrap items-center gap-2"
            >
              {STATUS_TABS.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-[#3393B8] hover:text-[#22577A]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-80">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="search"
                aria-label="Search projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, city, or client..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#3393B8]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear project search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-0 p-1 cursor-pointer"
                >
                  <FiX className="text-xs" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spin size="large" />
              <span className="text-xs font-medium text-slate-500">
                Loading architectural portfolio...
              </span>
            </div>
          ) : paginatedProjects.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] py-14 px-6 text-center max-w-lg mx-auto">
              <h3 className="text-base font-bold text-[#14171A] m-0">
                No matching projects found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-5">
                Try adjusting your search keywords or switch back to all installations.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProjects.map((project) => {
                  const images = normalizeProjectImages(project.Project_Images);
                  const status = getProjectStatus(project);
                  const durationLabel = formatProjectDuration(
                    project.Project_CreatedAt,
                    project.Project_FinishedDate
                  );

                  return (
                    <article
                      key={project.ProjectID}
                      className="group rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col hover:border-[#3393B8]/60 hover:shadow-[0_18px_40px_-15px_rgba(15,23,42,0.12)] transition-all"
                    >
                      {/* Project Cover Image */}
                      <button
                        type="button"
                        aria-label={`Open gallery for ${project.Project_Title}`}
                        onClick={() => openPreview(project, 0)}
                        className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 border-0 p-0 cursor-pointer text-left block"
                      >
                        <img
                          src={images[0]}
                          alt={project.Project_Title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block"
                        />

                        {/* Status Badge */}
                        <span
                          className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-sm shadow-xs ${
                            status === "completed"
                              ? "bg-white/95 text-[#22577A]"
                              : "bg-[#22577A]/90 text-white"
                          }`}
                        >
                          <FiCheckCircle className="text-[11px]" />
                          {status === "completed" ? "Completed" : "Ongoing"}
                        </span>

                        {/* Multi-photo Indicator */}
                        {images.length > 1 && (
                          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-medium backdrop-blur-sm">
                            <FiImage className="text-[11px]" />
                            {images.length} Photos
                          </span>
                        )}
                      </button>

                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500 mb-2">
                          <span className="inline-flex items-center gap-1 text-[#22577A]">
                            <FiMapPin className="shrink-0" />
                            <span>{project.Location}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FiClock className="shrink-0" />
                            <span>{durationLabel}</span>
                          </span>
                        </div>

                        <h3
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          className="text-[17px] font-bold text-[#14171A] leading-snug tracking-tight m-0"
                        >
                          {project.Project_Title}
                        </h3>

                        <p className="mt-2 text-[13px] leading-relaxed text-[#5F6672] line-clamp-3 mb-4">
                          {project.Project_Description}
                        </p>

                        {/* Architectural Specs & Client Metadata */}
                        <div className="mt-auto pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 inline-flex items-center gap-1.5">
                              <FiBriefcase className="text-slate-400" />
                              Client
                            </span>
                            <span className="font-semibold text-[#14171A] text-right truncate max-w-[65%]">
                              {project.Client_Company || project.Client_Name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 inline-flex items-center gap-1.5">
                              <FiMail className="text-slate-400" />
                              Contact
                            </span>
                            <span className="text-slate-600 text-right truncate max-w-[65%]">
                              {project.Client_Name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Project Value</span>
                            <span className="font-bold text-[#22577A] tabular-nums">
                              {formatCurrencyLkr(project.Budget)}
                            </span>
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => openPreview(project, 0)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] hover:text-[#22577A] transition-colors cursor-pointer"
                          >
                            <FiImage className="text-xs" />
                            <span>View Photos</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleRequestQuote(project.Project_Title)
                            }
                            className="request-quote-fx flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold transition-all cursor-pointer"
                          >
                            <FiSend className="relative z-10 text-xs" />
                            <span className="relative z-10">Request Quote</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {filteredProjects.length > pageSize && (
                <div className="flex justify-center mt-10">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredProjects.length}
                    showSizeChanger
                    pageSizeOptions={["6", "9", "12"]}
                    onChange={(page, limit) => {
                      setCurrentPage(page);
                      setPageSize(limit);
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Bottom Architectural Consultation Banner matching About Footer CTA */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="max-w-xl">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#22577A]/80">
                Start Your Build
              </span>
              <h3
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="mt-1 text-xl sm:text-2xl font-bold text-[#14171A] tracking-tight m-0"
              >
                Planning a Custom Glazing or Facade Project?
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#5F6672] m-0">
                Share your architectural drawings or site measurements with our engineering team for a detailed fabrication proposal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] hover:text-[#22577A] transition-colors no-underline"
              >
                <span>Explore Systems</span>
                <FiArrowRight className="text-xs" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  handleRequestQuote("Custom Architectural Project")
                }
                className="request-quote-fx inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <FiSend className="relative z-10 text-xs" />
                <span className="relative z-10">Request Quote</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Projects;
