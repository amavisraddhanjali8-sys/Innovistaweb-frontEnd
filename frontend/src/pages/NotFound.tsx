import { Link } from "react-router-dom";
import { FiArrowLeft, FiGrid, FiHome } from "react-icons/fi";
import PageMetadata from "../components/PageMetadata";

export default function NotFound() {
  return (
    <section className="flex-1 flex items-center justify-center bg-[#F8FAFC] px-4 py-20">
      <PageMetadata
        title="Page Not Found (404)"
        description="The requested Innovista Fabriconix page could not be found."
        noIndex
      />
      <div className="max-w-lg w-full bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 text-center shadow-[0_12px_36px_-22px_rgba(34,87,122,0.2)] space-y-5">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#3393B8]">
          404 · Page Not Found
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14171A] tracking-tight m-0">
          This architectural page is unavailable
        </h1>
        <p className="text-sm text-[#475569] leading-relaxed m-0">
          The route you requested could not be found or may have moved. Return to
          our home showcase or browse our aluminium &amp; glazing systems catalog.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22577A] hover:bg-[#1a4460] text-white text-sm font-semibold no-underline transition-colors"
          >
            <FiHome className="text-sm" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 hover:border-[#22577A] text-slate-700 hover:text-[#22577A] text-sm font-semibold no-underline transition-colors"
          >
            <FiGrid className="text-sm" />
            <span>Browse Products</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-500 hover:text-[#22577A] text-sm font-medium bg-transparent border-0 cursor-pointer"
          >
            <FiArrowLeft className="text-sm" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </section>
  );
}
