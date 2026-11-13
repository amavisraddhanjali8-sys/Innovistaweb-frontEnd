import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Modal, message } from "antd";
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiLayers,
  FiMail,
  FiMaximize2,
  FiMinus,
  FiPlus,
  FiSettings,
  FiShoppingBag,
  FiSliders,
} from "react-icons/fi";
import {
  MdColorLens,
  MdOutlineArchitecture,
  MdOutlineLock,
  MdOutlineStraighten,
  MdOutlineViewCompact,
  MdOutlineWindow,
} from "react-icons/md";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import ProductSystemCard from "../components/ProductSystemCard";
import ConfigurationDiagramSvg from "../components/ConfigurationDiagramSvg";
import CertificationBadgeCard from "../components/CertificationBadgeCard";
import ProductAccessoriesShowcase from "../components/ProductAccessoriesShowcase";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import RequestQuoteModal from "../components/RequestQuoteModal";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  classifyHexColorFamily,
  hasPerformanceSpec,
  normalizeDesignItem,
  normalizeProductCategory,
  resolveRelatedDesigns,
  sanitizeDesignImages,
  slugifyCategoryName,
  triggerDesignSpecDownload,
  type CustomizationCategory,
  type DesignItem,
  type ProductCategory,
} from "../utils/productCatalogHelpers";

type DetailTabKey = "features" | "performance" | "configuration" | "download";

function renderCustomizationIcon(category: CustomizationCategory) {
  switch (category) {
    case "color":
      return <MdColorLens className="text-2xl text-white" />;
    case "glass":
      return <MdOutlineWindow className="text-2xl text-white" />;
    case "frame":
      return <MdOutlineViewCompact className="text-2xl text-white" />;
    case "size":
      return <MdOutlineStraighten className="text-2xl text-white" />;
    case "hardware":
      return <MdOutlineLock className="text-2xl text-white" />;
    case "style":
    default:
      return <MdOutlineArchitecture className="text-2xl text-white" />;
  }
}

export default function ProductDetails() {
  const { designId } = useParams<{ designId?: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const resolvedId = useMemo(() => {
    if (designId) return designId;
    const params = new URLSearchParams(location.search);
    return params.get("id") || "1";
  }, [designId, location.search]);

  const [allDesigns, setAllDesigns] = useState<DesignItem[]>(() =>
    DEFAULT_DESIGNS_CATALOG.map((d) => normalizeDesignItem(d))
  );
  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );
  const [rawDesign, setRawDesign] = useState<DesignItem | null>(null);
  const [apiRelated, setApiRelated] = useState<DesignItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [certLightboxImg, setCertLightboxImg] = useState<{
    title: string;
    image: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabKey>("features");
  const [certPageIndex, setCertPageIndex] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string>("faq-1");
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState(0);
  const [inCart, setInCart] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteAccessory, setQuoteAccessory] = useState<string | undefined>(undefined);

  const openQuoteModal = (accessory?: string) => {
    setQuoteAccessory(accessory);
    setQuoteModalOpen(true);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [allRes, catsRes, singleRes] = await Promise.all([
          AxiosConfig.get("/designs/all", { params: { page: 1, limit: 100 } }),
          AxiosConfig.get("/products/categories"),
          AxiosConfig.get(`/designs/${encodeURIComponent(resolvedId)}`).catch(
            () => null
          ),
        ]);

        if (!active) return;

        const loadedList: DesignItem[] = Array.isArray(allRes.data?.data)
          ? allRes.data.data.map((d: Partial<DesignItem>) => normalizeDesignItem(d))
          : DEFAULT_DESIGNS_CATALOG.map((d) => normalizeDesignItem(d));
        setAllDesigns(loadedList);

        const rawCats = Array.isArray(catsRes.data?.data)
          ? catsRes.data.data
          : Array.isArray(catsRes.data)
          ? catsRes.data
          : [];
        if (rawCats.length > 0) {
          setCategories(
            rawCats.map((c: Partial<ProductCategory>, idx: number) =>
              normalizeProductCategory(c, idx)
            )
          );
        }

        if (singleRes?.data?.data) {
          setRawDesign(normalizeDesignItem(singleRes.data.data));
          setApiRelated(
            Array.isArray(singleRes.data.relatedDesigns)
              ? singleRes.data.relatedDesigns.map((d: Partial<DesignItem>) =>
                  normalizeDesignItem(d)
                )
              : null
          );
        } else {
          const fallbackMatch =
            loadedList.find((d) => String(d.DesignID) === String(resolvedId)) ||
            loadedList[0];
          setRawDesign(fallbackMatch ? normalizeDesignItem(fallbackMatch) : null);
          setApiRelated(null);
        }
      } catch {
        const fallback =
          DEFAULT_DESIGNS_CATALOG.find(
            (d) => String(d.DesignID) === String(resolvedId)
          ) || DEFAULT_DESIGNS_CATALOG[0];
        if (active) {
          setRawDesign(normalizeDesignItem(fallback));
          setApiRelated(null);
        }
      } finally {
        if (active) {
          setLoading(false);
          setActivePhotoIndex(0);
          setActiveShowcaseIdx(0);
          setCertPageIndex(0);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [resolvedId]);

  const design: DesignItem = useMemo(() => {
    if (rawDesign) return rawDesign;
    const found =
      allDesigns.find((d) => String(d.DesignID) === String(resolvedId)) ||
      allDesigns[0] ||
      DEFAULT_DESIGNS_CATALOG[0];
    return normalizeDesignItem(found);
  }, [rawDesign, allDesigns, resolvedId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "[]");
      const list = Array.isArray(saved) ? saved.map(String) : [];
      setInCart(list.includes(String(design.DesignID)));
    } catch {
      setInCart(false);
    }
  }, [design.DesignID]);

  useEffect(() => {
    if (design.faqs && design.faqs.length > 0) {
      setOpenFaqId(design.faqs[0].id);
    } else {
      setOpenFaqId("");
    }
  }, [design.DesignID, design.faqs]);

  const photos = useMemo(
    () => sanitizeDesignImages(design.Design_Image),
    [design.Design_Image]
  );

  const primaryCategory = design.Categories?.[0] || "Architectural Systems";
  const categorySlug = slugifyCategoryName(primaryCategory);

  const relatedDesigns = useMemo(() => {
    if (apiRelated && apiRelated.length > 0) return apiRelated;
    return resolveRelatedDesigns(design, allDesigns, categories, 4);
  }, [apiRelated, design, allDesigns, categories]);

  const featureBullets = design.features || [];
  const featureTable = design.featureTable;
  const hasFeatureTable = Boolean(
    featureTable && featureTable.headers.length > 0 && featureTable.rows.length > 0
  );
  const hasFeaturesTab = featureBullets.length > 0 || hasFeatureTable;
  const hasPerfTab = hasPerformanceSpec(design.performance);
  const hasConfigTab = (design.configurations || []).length > 0;
  const hasDownloadTab = (design.downloads || []).length > 0;

  const availableTabs = useMemo(() => {
    const list: Array<{ key: DetailTabKey; label: string }> = [];
    if (hasFeaturesTab) list.push({ key: "features", label: "Product Features" });
    if (hasPerfTab) list.push({ key: "performance", label: "Product Performance" });
    if (hasConfigTab) list.push({ key: "configuration", label: "Configuration" });
    if (hasDownloadTab) list.push({ key: "download", label: "Download" });
    return list;
  }, [hasFeaturesTab, hasPerfTab, hasConfigTab, hasDownloadTab]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  const handleAddToCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "[]");
      const currentList: (string | number)[] = Array.isArray(saved) ? saved : [];
      const keyStr = String(design.DesignID);

      if (!currentList.some((id) => String(id) === keyStr)) {
        const nextList = [...currentList, design.DesignID];
        localStorage.setItem("cart", JSON.stringify(nextList));
        setInCart(true);
        window.dispatchEvent(new Event("innovista-cart-updated"));
        message.success(`${design.Design_Name} added to quotation cart.`);
      } else {
        message.info(`${design.Design_Name} is already in your quotation cart.`);
      }
    } catch {
      message.error("Could not update quotation cart.");
    }
  };

  const handlePrevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const certifications = design.certifications || [];
  const certificationImages = design.certificationImages || [];
  const hasAnyCertifications =
    certifications.length > 0 || certificationImages.length > 0;

  const certPagesCount = Math.max(1, Math.ceil(certifications.length / 4));
  const visibleCerts = certifications.slice(
    certPageIndex * 4,
    certPageIndex * 4 + 4
  );

  const accessories = design.accessories || [];
  const showcases = design.clientShowcases || [];
  const activeShowcase = showcases[activeShowcaseIdx] || showcases[0];

  const perf = design.performance!;

  return (
    <div className="w-full bg-white text-[#14171A]">
      {/* 1. Breadcrumb Strip */}
      <nav
        aria-label="Breadcrumb"
        className="w-full bg-slate-50/90 border-y border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to="/" className="hover:text-[#22577A] no-underline text-slate-600">
              Innovista
            </Link>
            <span aria-hidden="true">»</span>
            <Link
              to="/products"
              className="hover:text-[#22577A] no-underline text-slate-600"
            >
              Products
            </Link>
            <span aria-hidden="true">»</span>
            <Link
              to={`/products/category/${categorySlug}`}
              className="hover:text-[#22577A] no-underline text-slate-600"
            >
              {primaryCategory}
            </Link>
            <span aria-hidden="true">»</span>
            <span className="font-semibold text-[#22577A]">{design.Design_Name}</span>
          </div>

          {user?.role === "admin" && (
            <Link
              to="/ViewAllDesigns"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22577A] hover:text-[#3393B8] no-underline"
            >
              <FiSliders className="text-xs" />
              <span>Edit in Admin</span>
            </Link>
          )}
        </div>
      </nav>

      {/* 2. Product Hero Gallery & Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {loading && !rawDesign ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-6 aspect-[4/3] bg-slate-200" />
            <div className="lg:col-span-6 space-y-4">
              <div className="h-9 w-3/4 bg-slate-200" />
              <div className="h-28 w-full bg-slate-100" />
              <div className="h-11 w-48 bg-slate-200" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Thumbnail Column + Main Image Stage */}
            <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-3.5 items-stretch">
              {/* Vertical Thumbnails */}
              <div className="flex sm:flex-col gap-2.5 sm:w-20 overflow-x-auto sm:overflow-y-auto shrink-0">
                {photos.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    aria-label={`View gallery photo ${idx + 1}`}
                    className={`w-20 h-20 sm:w-full sm:h-20 overflow-hidden border-2 shrink-0 cursor-pointer transition-all rounded-lg ${
                      idx === activePhotoIndex
                        ? "border-[#22577A] ring-2 ring-[#3393B8]/25 opacity-100"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${design.Design_Name} thumbnail ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover block"
                    />
                  </button>
                ))}
              </div>

              {/* Main Stage with Arrows & Zoom Icon */}
              <div className="relative flex-1 flex items-center gap-2">
                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    aria-label="Previous product image"
                    className="w-8 h-8 rounded-full text-slate-500 hover:text-[#22577A] hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <FiChevronLeft className="text-lg" />
                  </button>
                )}

                <div className="relative flex-1 aspect-[4/3] bg-slate-100 border border-slate-200 overflow-hidden rounded-xl shadow-[0_14px_38px_-22px_rgba(34,87,122,0.2)]">
                  <img
                    src={photos[activePhotoIndex] || photos[0]}
                    alt={design.Design_Name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover block"
                  />

                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="Zoom product image"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#22577A] shadow-sm border border-slate-200/80 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <FiMaximize2 className="text-sm" />
                  </button>
                </div>

                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    aria-label="Next product image"
                    className="w-8 h-8 rounded-full text-slate-500 hover:text-[#22577A] hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <FiChevronRight className="text-lg" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Overview & Quote CTA */}
            <div className="lg:col-span-6 space-y-5">
              <div>
                <div className="inline-block text-[11px] font-bold uppercase tracking-[0.16em] text-[#3393B8] mb-1.5">
                  {primaryCategory}
                </div>
                <h1
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    background:
                      "linear-gradient(to right, #e60000 0%, #6a2c40 22%, #22577a 50%, #6a2c40 78%, #e60000 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                  className="inline-block text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight leading-tight"
                >
                  {design.Design_Name}
                </h1>

                <p className="mt-4 text-sm sm:text-[15px] text-[#475569] leading-relaxed">
                  {design.Design_Description}
                </p>
              </div>

              {/* Compact Finishes & Size Span Row */}
              {(design.Design_Colors?.length > 0 || design.Design_Sizes?.length > 0) && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {design.Design_Colors?.length > 0 && (
                    <div>
                      <div className="font-semibold text-[#22577A] uppercase tracking-wider text-[10.5px] mb-2">
                        Available Finishes
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {design.Design_Colors.map((hex, idx) => (
                          <span
                            key={idx}
                            title={`${hex} (${classifyHexColorFamily(hex)})`}
                            style={{ backgroundColor: hex }}
                            className="w-5 h-5 rounded-full border border-slate-300 inline-block shadow-2xs"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {design.Design_Sizes?.length > 0 && (
                    <div>
                      <div className="font-semibold text-[#22577A] uppercase tracking-wider text-[10.5px] mb-2">
                        Standard &amp; Custom Spans
                      </div>
                      <div className="text-slate-700 font-medium leading-snug">
                        {design.Design_Sizes.join(" · ")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Primary & Secondary Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openQuoteModal()}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <FiMail className="text-base" />
                  <span>Request Quote</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`px-5 py-3 rounded-lg border text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    inCart
                      ? "bg-sky-50 border-[#3393B8] text-[#22577A]"
                      : "bg-white border-slate-300 hover:border-[#22577A] text-slate-800 hover:text-[#22577A]"
                  }`}
                >
                  {inCart ? (
                    <>
                      <FiCheck className="text-base text-[#3393B8]" />
                      <span>In Quote Cart</span>
                    </>
                  ) : (
                    <>
                      <FiShoppingBag className="text-base" />
                      <span>Add to Quote Cart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Dynamic Technical Tabs (Hidden completely if none configured) */}
      {availableTabs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div
            role="tablist"
            aria-label="Product technical specification tabs"
            style={{
              gridTemplateColumns: `repeat(${Math.min(availableTabs.length, 4)}, minmax(0, 1fr))`,
            }}
            className="grid bg-[#F1F5F9] border border-slate-200/80 rounded-t-xl overflow-hidden"
          >
            {availableTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-3.5 px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center ${
                    isActive
                      ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white"
                      : "text-slate-700 hover:text-[#22577A] hover:bg-slate-200/50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="pt-8 space-y-8">
            {/* Tab 1: Product Features + Admin Designed / Excel Feature Table */}
            {activeTab === "features" && hasFeaturesTab && (
              <div className="space-y-8">
                {featureBullets.length > 0 && (
                  <ul className="space-y-3 pl-5 list-disc text-sm sm:text-[15px] text-[#475569] leading-relaxed max-w-5xl">
                    {featureBullets.map((feat, idx) => (
                      <li key={idx} className="pl-1 marker:text-[#3393B8]">
                        {feat}
                      </li>
                    ))}
                  </ul>
                )}

                {hasFeatureTable && featureTable && (
                  <div className="space-y-3">
                    {featureTable.title && (
                      <h3 className="text-base sm:text-lg font-bold text-[#22577A] m-0">
                        {featureTable.title}
                      </h3>
                    )}
                    <div
                      data-feature-table="true"
                      className="overflow-x-auto rounded-xl border border-slate-200 shadow-[0_8px_24px_-16px_rgba(34,87,122,0.18)]"
                    >
                      <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-[13px]">
                        <thead>
                          <tr className="bg-[#22577A] text-white font-semibold">
                            {featureTable.headers.map((header, hIdx) => (
                              <th
                                key={hIdx}
                                className="p-3.5 border-r last:border-r-0 border-white/15 whitespace-nowrap"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {featureTable.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={rIdx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}
                            >
                              {featureTable.headers.map((_, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="p-3.5 border-t border-r last:border-r-0 border-slate-200 text-slate-700"
                                >
                                  {row[cIdx] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Product Performance Spec Table */}
            {activeTab === "performance" && hasPerfTab && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs sm:text-[13px]">
                  <tbody>
                    <tr className="bg-[#22577A] text-white font-semibold">
                      <th className="p-3.5 border-b border-r border-white/15 w-1/5">
                        Airtightness
                      </th>
                      <th className="p-3.5 border-b border-r border-white/15 w-1/5">
                        Water-tightness
                      </th>
                      <th className="p-3.5 border-b border-r border-white/15 w-1/5">
                        Sound Insulation
                      </th>
                      <th className="p-3.5 border-b border-r border-white/15 w-1/5">
                        Thermal Insulation
                      </th>
                      <th className="p-3.5 border-b border-white/15 w-1/5">
                        Wind Resistance
                      </th>
                    </tr>
                    <tr className="bg-white text-slate-700">
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.airtightness || "—"}
                      </td>
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.watertightness || "—"}
                      </td>
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.soundInsulation || "—"}
                      </td>
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.thermalInsulation || "—"}
                      </td>
                      <td className="p-3.5 border-b border-slate-200">
                        {perf.windResistance || "—"}
                      </td>
                    </tr>

                    <tr className="bg-[#F1F5F9] text-[#22577A] font-semibold">
                      <th className="p-3.5 border-b border-r border-slate-200">
                        System Type
                      </th>
                      <th className="p-3.5 border-b border-r border-slate-200">
                        Visible Surface
                      </th>
                      <th className="p-3.5 border-b border-r border-slate-200">
                        Wall Thickness
                      </th>
                      <th className="p-3.5 border-b border-r border-slate-200">
                        Frame Thickness
                      </th>
                      <th className="p-3.5 border-b border-slate-200">
                        Size Range (mm)
                      </th>
                    </tr>
                    <tr className="bg-white text-slate-700">
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.productType || "—"}
                      </td>
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.visibleSurface || "—"}
                      </td>
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.wallThickness || "—"}
                      </td>
                      <td className="p-3.5 border-b border-r border-slate-200">
                        {perf.frameThickness || "—"}
                      </td>
                      <td className="p-3.5 border-b border-slate-200">
                        {perf.sizeRange || "—"}
                      </td>
                    </tr>

                    <tr className="bg-[#F1F5F9] text-[#22577A] font-semibold">
                      <th className="p-3.5 border-b border-r border-slate-200" colSpan={3}>
                        Glass Thickness
                      </th>
                      <th className="p-3.5 border-b border-slate-200" colSpan={2}>
                        Maximum Load-Bearing
                      </th>
                    </tr>
                    <tr className="bg-white text-slate-700">
                      <td className="p-3.5 border-r border-slate-200" colSpan={3}>
                        {perf.glassThickness || "—"}
                      </td>
                      <td className="p-3.5" colSpan={2}>
                        {perf.maxLoadBearing || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Opening Configuration Diagrams */}
            {activeTab === "configuration" && hasConfigTab && (
              <div className="py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                {(design.configurations || []).map((cfg, idx) => (
                  <ConfigurationDiagramSvg key={`${cfg}-${idx}`} code={cfg} />
                ))}
              </div>
            )}

            {/* Tab 4: Download Model & CAD Files */}
            {activeTab === "download" && hasDownloadTab && (
              <div className="space-y-4 max-w-2xl">
                {(design.downloads || []).map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => triggerDesignSpecDownload(design, doc)}
                    className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-[#22577A] bg-[#F8FAFC] hover:bg-white text-left cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-[#22577A] text-white flex flex-col items-center justify-center shrink-0">
                        {doc.fileType === "CAD" ? (
                          <FiLayers className="text-base" />
                        ) : (
                          <FiFileText className="text-base" />
                        )}
                        <span className="text-[8px] font-bold leading-none mt-0.5">
                          {doc.fileType}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-[#22577A]">
                        {doc.title}
                      </span>
                    </div>
                    <FiDownload className="text-slate-400 group-hover:text-[#22577A] text-base shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3B. Accessories & Variants Slideshow + Auto-Sliding Ribbon (Special products e.g. Doors / Windows; hidden if empty) */}
      <ProductAccessoriesShowcase
        heading={design.accessoriesHeading || "Hardware & Accessory Variants"}
        tagline={design.accessoriesTagline}
        accessories={accessories}
        slideshowSpeedMs={design.accessoriesSlideshowSpeedMs}
        ribbonSpeed={design.accessoriesRibbonSpeed}
        onQuoteWithVariant={(variantLabel) => openQuoteModal(variantLabel)}
      />

      {/* 4. Certifications (Up to 8 Uploaded Images + Rating Badges Carousel; hidden if both empty) */}
      {hasAnyCertifications && (
        <section
          id="product-certifications"
          className="w-full bg-white py-12 border-t border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <AboutTaglineHeading
              kicker="Tested Compliance & Lab Reports"
              heading="Certifications"
              tagline="Verified thermal, wind-load, acoustic, and marine corrosion certificates."
            />

            {/* Up to 8 Uploaded Certification Images Grid */}
            {certificationImages.length > 0 && (
              <div
                data-cert-images-grid="true"
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                {certificationImages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCertLightboxImg({ title: item.title, image: item.image })}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-[#3393B8] bg-[#F8FAFC] text-left cursor-pointer transition-all shadow-[0_6px_20px_-14px_rgba(34,87,122,0.22)]"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block"
                      />
                    </div>
                    <div className="px-3 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#22577A] line-clamp-1">
                        {item.title}
                      </span>
                      <FiMaximize2 className="text-[11px] text-slate-400 group-hover:text-[#3393B8] shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Structured Energy Performance Rating Carousel */}
            {certifications.length > 0 && (
              <div>
                <div className="relative flex items-center gap-2">
                  {certPagesCount > 1 && (
                    <button
                      type="button"
                      aria-label="Previous certification page"
                      onClick={() =>
                        setCertPageIndex(
                          (prev) => (prev - 1 + certPagesCount) % certPagesCount
                        )
                      }
                      className="w-9 h-9 rounded-full border border-slate-200 hover:border-[#22577A] text-slate-500 hover:text-[#22577A] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <FiChevronLeft />
                    </button>
                  )}

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                    {visibleCerts.map((cert) => (
                      <CertificationBadgeCard
                        key={cert.id}
                        cert={cert}
                        systemName={design.Design_Name}
                      />
                    ))}
                  </div>

                  {certPagesCount > 1 && (
                    <button
                      type="button"
                      aria-label="Next certification page"
                      onClick={() =>
                        setCertPageIndex((prev) => (prev + 1) % certPagesCount)
                      }
                      className="w-9 h-9 rounded-full border border-slate-200 hover:border-[#22577A] text-slate-500 hover:text-[#22577A] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <FiChevronRight />
                    </button>
                  )}
                </div>

                {certPagesCount > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-5">
                    {Array.from({ length: certPagesCount }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Certifications page ${idx + 1}`}
                        onClick={() => setCertPageIndex(idx)}
                        className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                          idx === certPageIndex ? "bg-[#22577A]" : "bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. FAQs Accordion (Hidden if empty) */}
      {design.faqs && design.faqs.length > 0 && (
        <section
          id="product-faqs"
          className="w-full bg-slate-50/75 border-y border-slate-100 py-12"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AboutTaglineHeading
              kicker="Engineering Clarifications"
              heading="FAQs"
              tagline="Answers to common architectural, glazing, and coastal installation questions."
            />

            <div className="space-y-1.5">
              {design.faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="rounded-lg overflow-hidden border border-slate-200/80 bg-white">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? "" : faq.id)}
                      className="w-full flex items-stretch text-left bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <span
                        className={`w-11 shrink-0 text-white flex items-center justify-center text-sm font-bold transition-colors ${
                          isOpen ? "bg-[#3393B8]" : "bg-[#22577A]"
                        }`}
                      >
                        {isOpen ? <FiMinus /> : <FiPlus />}
                      </span>
                      <span className="px-4 py-3.5 text-sm font-semibold text-[#14171A]">
                        {faq.question}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="bg-[#F8FAFC] px-6 py-4 text-sm text-[#475569] leading-relaxed border-t border-slate-200/70">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. Performance & Technical Advantages (Hidden if empty) */}
      {design.advantages && design.advantages.length > 0 && (
        <section id="product-advantages" className="w-full bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AboutTaglineHeading
              kicker="Core Engineering Benefits"
              heading="Performance & Technical Advantages"
              tagline="Built to resist tropical heat, coastal salt air, and heavy monsoon weather."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {design.advantages.slice(0, 6).map((adv) => (
                <article
                  key={adv.id}
                  className="bg-[#F8FAFC] border border-slate-200/85 rounded-2xl overflow-hidden flex flex-col shadow-[0_10px_28px_-20px_rgba(34,87,122,0.2)]"
                >
                  <div className="aspect-[16/10] w-full bg-slate-200 overflow-hidden">
                    <img
                      src={adv.image}
                      alt={adv.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-2 flex-1">
                    <h3 className="text-base font-bold text-[#22577A]">{adv.title}</h3>
                    <p className="text-xs sm:text-[13px] text-[#475569] leading-relaxed m-0">
                      {adv.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => openQuoteModal()}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <FiMail />
                <span>Request Quote</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 7. Customization Options 3x2 Icon Card Grid (Hidden if empty) */}
      {design.customizations && design.customizations.length > 0 && (
        <section
          id="product-customizations"
          className="w-full bg-slate-50/75 border-y border-slate-100 py-12"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AboutTaglineHeading
              kicker="Tailored Specifications"
              heading={`Customization Options For ${design.Design_Name}`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {design.customizations.map((cust) => (
                <div
                  key={cust.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_14px_rgba(15,23,42,0.03)] p-7 text-center flex flex-col items-center gap-3 hover:border-[#3393B8]/60 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-[#22577A] flex items-center justify-center shadow-sm">
                    {renderCustomizationIcon(cust.category)}
                  </div>
                  <h3 className="text-base font-bold text-[#14171A] mt-1">
                    {cust.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] leading-relaxed max-w-xs m-0">
                    {cust.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => openQuoteModal()}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <FiMail />
                <span>Request Quote</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 8. Our Partner Services (Hidden if empty) */}
      {design.partnerServices && design.partnerServices.length > 0 && (
        <section
          id="product-partner-services"
          className="relative w-full py-14 sm:py-16 overflow-hidden"
        >
          <img
            src={design.partnerServiceBannerImage || "/assets/about/facade.jpg"}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(16,42,66,0.92) 0%, rgba(34,87,122,0.85) 100%)",
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5CB6D2]">
                End-To-End Project Delivery
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Our Partner Services
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm text-sky-100/90 m-0">
                At Innovista, we partner with architects, developers, and contractors to deliver calibrated fabrication and certified installation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {design.partnerServices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-white rounded-xl p-7 text-center shadow-lg flex flex-col items-center gap-3 border border-white/60"
                >
                  <div className="w-12 h-12 rounded-full bg-[#22577A] text-white text-base font-bold flex items-center justify-center tabular-nums shadow-xs">
                    {srv.step}
                  </div>
                  <h3 className="text-base font-bold text-[#14171A] mt-1">
                    {srv.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] leading-relaxed m-0">
                    {srv.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. Client Installations Showcase Strip (Hidden cleanly if no showcases are configured!) */}
      {showcases.length > 0 && activeShowcase && (
        <section
          id="product-client-installations"
          className="w-full bg-white py-12 border-t border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AboutTaglineHeading
              kicker="Site Proof & References"
              heading="Client Installations"
              tagline="Completed architectural commissions across residential villas and commercial developments."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-3 flex flex-col gap-2.5">
                {showcases.map((sc, idx) => {
                  const isSelected = idx === activeShowcaseIdx;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setActiveShowcaseIdx(idx)}
                      className={`w-full px-4 py-3.5 rounded-lg text-left text-xs sm:text-[13px] font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-xs"
                          : "bg-[#F1F5F9] text-[#22577A] border-slate-200 hover:bg-slate-200/70"
                      }`}
                    >
                      {sc.location}
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-9 relative aspect-[16/8] min-h-[260px] rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                <img
                  src={activeShowcase.image}
                  alt={activeShowcase.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(11,31,51,0.90) 0%, rgba(15,23,42,0.22) 50%, rgba(15,23,42,0.04) 100%)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => openQuoteModal()}
                  className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer shadow-md transition-all"
                >
                  Request Quote
                </button>

                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5CB6D2]">
                    {activeShowcase.location}
                  </div>
                  <div className="text-base sm:text-lg font-bold mt-0.5">
                    {activeShowcase.title}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 9b. Page Advertisement Promotion Popup */}
      <PageAdBannerSlideshow pageKey="product-details" />

      {/* 10. Related Products For You (Admin-Linked + Category Siblings) */}
      {relatedDesigns.length > 0 && (
        <section
          id="product-related"
          className="w-full bg-slate-50/75 border-t border-slate-100 py-14"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <AboutTaglineHeading
                kicker="Compatible Systems"
                heading="Related Products For You"
                align="left"
                compact
              />
              {user?.role === "admin" && (
                <Link
                  to="/ViewAllDesigns"
                  className="text-xs font-semibold text-[#22577A] hover:text-[#3393B8] hover:underline inline-flex items-center gap-1 no-underline shrink-0 mb-2"
                >
                  <FiSettings className="text-xs" />
                  <span>Manage Linked Products</span>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {relatedDesigns.map((rel) => (
                <ProductSystemCard key={rel.DesignID} design={rel} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Accessible Photo Zoom Modal */}
      <Modal
        open={lightboxOpen}
        onCancel={() => setLightboxOpen(false)}
        footer={null}
        centered
        width={860}
        title={<span className="font-bold text-slate-900">{design.Design_Name}</span>}
      >
        <div className="space-y-3 pt-2">
          <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden rounded-lg">
            <img
              src={photos[activePhotoIndex] || photos[0]}
              alt={design.Design_Name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain bg-slate-900"
            />
          </div>
          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {photos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-16 h-12 rounded overflow-hidden border-2 cursor-pointer ${
                    idx === activePhotoIndex
                      ? "border-[#22577A]"
                      : "border-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Accessible Certificate Document Zoom Modal */}
      <Modal
        open={Boolean(certLightboxImg)}
        onCancel={() => setCertLightboxImg(null)}
        footer={null}
        centered
        width={760}
        title={
          <span className="font-bold text-[#22577A]">
            {certLightboxImg?.title || "Certificate"}
          </span>
        }
      >
        {certLightboxImg && (
          <div className="pt-2">
            <div className="aspect-[16/11] w-full bg-slate-900 rounded-lg overflow-hidden">
              <img
                src={certLightboxImg.image}
                alt={certLightboxImg.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </Modal>

      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        productId={design.DesignID}
        productName={design.Design_Name}
        categoryName={primaryCategory}
        accessoryName={quoteAccessory}
      />
    </div>
  );
}
