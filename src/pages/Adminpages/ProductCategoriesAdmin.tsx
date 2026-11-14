import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  App as AntdApp,
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Slider,
  Spin,
  Switch,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import {
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  moveArrayItem,
  type HeroSlide,
} from "../../utils/aboutContentHelpers";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  PRODUCT_ASSET_PRESETS,
  createDefaultCategorySlides,
  normalizeProductCategory,
  normalizeProductLandingCms,
  slugifyCategoryName,
  type ProductCategory,
  type ProductLandingCms,
  type WhyChooseAccent,
  type WhyChooseIcon,
} from "../../utils/productCatalogHelpers";

const SPEED_PRESETS = [
  { label: "Fast (1.5s)", ms: 1500 },
  { label: "Brisk (2.5s)", ms: 2500 },
  { label: "Balanced (4s)", ms: 4000 },
  { label: "Classic (5.5s)", ms: 5500 },
  { label: "Calm (8s)", ms: 8000 },
];

export default function ProductCategoriesAdmin() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "slideshow"
      ? "slideshow"
      : tabParam === "whychoose"
      ? "whychoose"
      : "categories";

  const [activeTab, setActiveTab] = useState<
    "categories" | "slideshow" | "whychoose"
  >(initialTab);
  const [loading, setLoading] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Product Landing Slideshow State
  const [landingCms, setLandingCms] = useState<ProductLandingCms>(
    DEFAULT_PRODUCT_LANDING_CMS
  );
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // Categories CRUD State
  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );

  // Category Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catTagline, setCatTagline] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catCoverImage, setCatCoverImage] = useState(PRODUCT_ASSET_PRESETS[0].url);
  const [catFeatured, setCatFeatured] = useState(true);
  const [catSpecsText, setCatSpecsText] = useState(
    "Custom Dimensions, Anodized Finish, Site Tested"
  );
  const [catSlideshowSpeedMs, setCatSlideshowSpeedMs] = useState(4500);
  const [catHeroSlides, setCatHeroSlides] = useState<HeroSlide[]>([]);

  const fetchAllProductCms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get("/products/cms");
      const rawLanding = res.data?.landing ?? res.data?.data;
      if (rawLanding) {
        setLandingCms(normalizeProductLandingCms(rawLanding));
      }
      if (Array.isArray(res.data?.categories)) {
        setCategories(
          res.data.categories.map((c: Partial<ProductCategory>, idx: number) =>
            normalizeProductCategory(c, idx)
          )
        );
      }
    } catch {
      message.error("Could not load Product Categories CMS.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchAllProductCms();
  }, [fetchAllProductCms]);

  const openCategoryEditor = useCallback((cat?: ProductCategory) => {
    if (cat) {
      setEditingId(cat.CategoryID);
      setCatName(cat.name);
      setCatSlug(cat.slug);
      setCatTagline(cat.tagline);
      setCatDescription(cat.description);
      setCatCoverImage(cat.coverImage);
      setCatFeatured(cat.featured);
      setCatSpecsText((cat.specHighlights || []).join(", "));
      setCatSlideshowSpeedMs(cat.slideshowSpeedMs || 4500);
      setCatHeroSlides(
        cat.heroSlides?.length
          ? cat.heroSlides
          : createDefaultCategorySlides(cat.name, cat.tagline, cat.coverImage)
      );
    } else {
      const defaultCover =
        PRODUCT_ASSET_PRESETS[categories.length % PRODUCT_ASSET_PRESETS.length].url;
      setEditingId(null);
      setCatName("");
      setCatSlug("");
      setCatTagline("");
      setCatDescription("");
      setCatCoverImage(defaultCover);
      setCatFeatured(true);
      setCatSpecsText("20mm Sightlines, Marine Powder Coat, Site Tested");
      setCatSlideshowSpeedMs(4500);
      setCatHeroSlides([
        {
          id: `new-cat-s1-${Date.now()}`,
          headline: "Architectural Category Series",
          subheadline:
            "Precision aluminium and laminated glass fabricated to exact site dimensions.",
          image: defaultCover,
        },
      ]);
    }
    setEditorOpen(true);
  }, [categories.length]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "slideshow" ||
      requestedTab === "categories" ||
      requestedTab === "whychoose"
    ) {
      setActiveTab(requestedTab);
    }
    const editParam = searchParams.get("edit");
    if (editParam && categories.length > 0) {
      const match = categories.find(
        (c) => c.CategoryID === editParam || c.slug === editParam
      );
      if (match) {
        openCategoryEditor(match);
      }
    }
  }, [searchParams, categories, openCategoryEditor]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url || data.url) {
        return data.secure_url || data.url;
      }
    } catch {
      // Fallback to FileReader below
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        resolve(typeof e.target?.result === "string" ? e.target.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (
    file: File,
    key: string,
    onDone: (url: string) => void
  ) => {
    setUploadingKey(key);
    const url = await uploadImageFile(file);
    if (url) {
      onDone(url);
      message.success("Image uploaded.");
    } else {
      message.error("Could not upload image.");
    }
    setUploadingKey(null);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      message.warning("Please enter a category name.");
      return;
    }

    const cleanedSlides = (
      catHeroSlides.length > 0
        ? catHeroSlides
        : createDefaultCategorySlides(catName.trim(), catTagline.trim(), catCoverImage)
    ).map((s, idx) => {
      const rawHeadline = s.headline.trim();
      const resolvedHeadline =
        !rawHeadline || rawHeadline === "Architectural Category Series"
          ? idx === 0
            ? `${catName.trim()} Architectural Series`
            : `${catName.trim()} Collection ${idx + 1}`
          : rawHeadline;
      return {
        id: s.id || `cat-slide-${Date.now()}-${idx}`,
        headline: resolvedHeadline,
        subheadline:
          s.subheadline.trim() ||
          catTagline.trim() ||
          "Engineered architectural aluminium and glazing suite.",
        image: s.image.trim() || catCoverImage || PRODUCT_ASSET_PRESETS[0].url,
      };
    });

    const payload = {
      name: catName.trim(),
      slug: slugifyCategoryName(catSlug.trim() || catName.trim()),
      tagline:
        catTagline.trim() ||
        "Precision-engineered architectural aluminium systems.",
      description:
        catDescription.trim() ||
        "Fabricated from structural aluminium alloys with weather-tight architectural sealing.",
      coverImage: catCoverImage.trim() || PRODUCT_ASSET_PRESETS[0].url,
      featured: catFeatured,
      slideshowSpeedMs: clampSlideshowSpeedMs(catSlideshowSpeedMs, 4500),
      heroSlides: cleanedSlides,
      specHighlights: catSpecsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      setSavingCategory(true);
      if (editingId) {
        await AxiosConfig.put(`/products/categories/${editingId}`, payload);
        message.success(`Category "${payload.name}" updated.`);
      } else {
        await AxiosConfig.post("/products/categories", payload);
        message.success(`Category "${payload.name}" added.`);
      }
      setEditorOpen(false);
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("Failed to save product category.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    try {
      await AxiosConfig.delete(`/products/categories/${categoryId}`);
      message.success(`Category "${name}" deleted.`);
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("At least one active category must remain.");
    }
  };

  const handleReorderCategory = async (idx: number, direction: -1 | 1) => {
    const nextList = moveArrayItem(categories, idx, direction);
    setCategories(nextList);
    try {
      await AxiosConfig.put("/products/categories/reorder", {
        orderedIds: nextList.map((c) => c.CategoryID),
      });
      message.success("Category display order saved.");
    } catch {
      await fetchAllProductCms();
    }
  };

  const handleSaveLandingSlideshow = async () => {
    try {
      setSavingLanding(true);
      const cleaned = normalizeProductLandingCms(landingCms);
      await AxiosConfig.put("/products/cms", { landing: cleaned });
      message.success("Product landing slideshow & headings published!");
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("Failed to save product landing slideshow.");
    } finally {
      setSavingLanding(false);
    }
  };

  const activeLandingSlide =
    landingCms.heroSlides[previewSlideIdx] || landingCms.heroSlides[0];
  const landingSpeedSec = Number((landingCms.slideshowSpeedMs / 1000).toFixed(1));
  const catSpeedSec = Number((catSlideshowSpeedMs / 1000).toFixed(1));

  const rightRailContent = (
    <div className="space-y-5">
      {/* Live Product Landing Slideshow Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-[#3393B8]" />
            <span className="text-xs font-bold text-slate-900">
              Product Hero Preview
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#22577A] tabular-nums">
            {landingSpeedSec}s slide
          </span>
        </div>

        {activeLandingSlide && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                Slide {previewSlideIdx + 1} / {landingCms.heroSlides.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Preview Previous Slide"
                  onClick={() =>
                    setPreviewSlideIdx((prev) =>
                      getPrevSlideIndex(prev, landingCms.heroSlides.length)
                    )
                  }
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                >
                  <LeftOutlined className="text-[10px]" />
                </button>
                <button
                  type="button"
                  aria-label="Preview Next Slide"
                  onClick={() =>
                    setPreviewSlideIdx((prev) =>
                      getNextSlideIndex(prev, landingCms.heroSlides.length)
                    )
                  }
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                >
                  <RightOutlined className="text-[10px]" />
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#22577A] via-[#3393B8] to-white pt-4 text-center border border-slate-100">
              <h4 className="px-3 text-sm font-semibold text-white leading-snug">
                {activeLandingSlide.headline}
              </h4>
              <p className="px-3 mt-1 text-[11px] text-white/90 line-clamp-2">
                {activeLandingSlide.subheadline}
              </p>
              <img
                src={activeLandingSlide.image}
                alt={activeLandingSlide.headline}
                referrerPolicy="no-referrer"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 22%, black 85%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, black 22%, black 85%, transparent 100%)",
                }}
                className="w-full h-32 object-cover mt-1 block"
              />
            </div>
          </div>
        )}
      </div>

      {/* Categories Summary KPI Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900">
            Active Product Lines
          </span>
          <span className="text-lg font-bold text-[#22577A] tabular-nums">
            {categories.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 tabular-nums">
            <span className="font-bold text-[#22577A]">
              {landingCms.heroSlides.length}
            </span>{" "}
            <span className="text-slate-600">Main Slides</span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 tabular-nums">
            <span className="font-bold text-[#22577A]">
              {categories.reduce((acc, c) => acc + (c.heroSlides?.length || 1), 0)}
            </span>{" "}
            <span className="text-slate-600">Category Slides</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="py-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <EyeOutlined />
            <span>View Store</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/ViewAllDesigns")}
            className="py-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>All Designs</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => openCategoryEditor()}
          className="w-full py-3 px-4 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <PlusOutlined />
          <span>Add New Category</span>
        </button>
      </div>
    </div>
  );

  return (
    <AdminPortalShell
      sectionCode="Products & Categories"
      sectionTitle="Product Categories & Slideshow CMS"
      sectionSubtitle="Add, edit, reorder, or delete product categories and customize landing page slideshows."
      refreshTrigger={refreshTick}
      bannerLeftLines={[
        { label: "Active Categories", value: String(categories.length) },
        {
          label: "Main Slideshow",
          value: `${landingCms.heroSlides.length} slides (${landingSpeedSec}s)`,
        },
        {
          label: "Why Choose Us",
          value: `${landingCms.whyChooseUs.length} infographic items`,
        },
      ]}
      headerAction={
        activeTab === "categories"
          ? {
              label: "Add New Category",
              icon: <PlusOutlined />,
              onClick: () => openCategoryEditor(),
            }
          : {
              label: savingLanding
                ? "Publishing..."
                : activeTab === "whychoose"
                ? "Publish Why Choose Us"
                : "Publish Slideshow",
              icon: <SaveOutlined />,
              loading: savingLanding,
              onClick: handleSaveLandingSlideshow,
            }
      }
      customRightRail={rightRailContent}
    >
      <Spin spinning={loading}>
        {/* Accessible Tab Switcher */}
        <div
          role="tablist"
          aria-label="Product CMS sections"
          className="flex flex-wrap items-center gap-2 pb-4 mb-5 border-b border-slate-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "categories"}
            onClick={() => setActiveTab("categories")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-[#3393B8] text-white border-[#3393B8]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
            }`}
          >
            Product Categories ({categories.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "slideshow"}
            onClick={() => setActiveTab("slideshow")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "slideshow"
                ? "bg-[#3393B8] text-white border-[#3393B8]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
            }`}
          >
            Product Landing Slideshow ({landingCms.heroSlides.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "whychoose"}
            onClick={() => setActiveTab("whychoose")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "whychoose"
                ? "bg-[#3393B8] text-white border-[#3393B8]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
            }`}
          >
            Why Choose Us ({landingCms.whyChooseUs.length})
          </button>
        </div>

        {/* TAB 1: Product Categories CRUD + Per-Category Slideshow */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Manage Product Categories & Category Landing Pages
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Each category automatically gets its own landing page at /products/category/slug with custom hero slides.
                </p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCategoryEditor()}
                style={{ background: "#22577A", borderColor: "#22577A" }}
              >
                Add Category
              </Button>
            </div>

            <div className="space-y-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat.CategoryID}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={cat.coverImage}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-medium text-[#22577A]">
                          /products/category/{cat.slug}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        {cat.tagline}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                        {cat.heroSlides?.length || 1} category{" "}
                        {(cat.heroSlides?.length || 1) === 1 ? "slide" : "slides"} ·{" "}
                        {((cat.slideshowSpeedMs || 4500) / 1000).toFixed(1)}s auto-change
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={idx === 0}
                      aria-label={`Move ${cat.name} Up`}
                      onClick={() => handleReorderCategory(idx, -1)}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={idx === categories.length - 1}
                      aria-label={`Move ${cat.name} Down`}
                      onClick={() => handleReorderCategory(idx, 1)}
                    />
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/products/category/${cat.slug}`)}
                    >
                      Landing
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => openCategoryEditor(cat)}
                      style={{ background: "#22577A", borderColor: "#22577A" }}
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title={`Delete "${cat.name}" category?`}
                      description="This removes the category card and its landing route."
                      okText="Delete"
                      cancelText="Cancel"
                      onConfirm={() => handleDeleteCategory(cat.CategoryID, cat.name)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={categories.length <= 1}
                        aria-label={`Delete ${cat.name}`}
                      />
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Product Landing Page Slideshow & Speed */}
        {activeTab === "slideshow" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs font-bold text-[#22577A]">
                    Product Landing Auto-Change Speed
                  </div>
                  <div className="text-xs text-slate-600">
                    Controls how fast hero slides rotate on the main /products landing page.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="product-landing-speed"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Interval (sec):
                  </label>
                  <InputNumber
                    id="product-landing-speed"
                    min={1.5}
                    max={20}
                    step={0.5}
                    value={landingSpeedSec}
                    onChange={(val) => {
                      if (typeof val === "number") {
                        setLandingCms((prev) => ({
                          ...prev,
                          slideshowSpeedMs: clampSlideshowSpeedMs(val * 1000),
                        }));
                      }
                    }}
                    style={{ width: 90 }}
                  />
                </div>
              </div>

              <Slider
                min={1.5}
                max={15}
                step={0.5}
                value={landingSpeedSec}
                onChange={(val) =>
                  setLandingCms((prev) => ({
                    ...prev,
                    slideshowSpeedMs: clampSlideshowSpeedMs(val * 1000),
                  }))
                }
              />

              <div className="flex flex-wrap items-center gap-2">
                {SPEED_PRESETS.map((preset) => {
                  const isActive = landingCms.slideshowSpeedMs === preset.ms;
                  return (
                    <button
                      key={preset.ms}
                      type="button"
                      onClick={() =>
                        setLandingCms((prev) => ({
                          ...prev,
                          slideshowSpeedMs: preset.ms,
                        }))
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#3393B8] text-white border-[#3393B8]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categories Section Title
                </label>
                <Input
                  value={landingCms.categoriesHeading}
                  onChange={(e) =>
                    setLandingCms((prev) => ({
                      ...prev,
                      categoriesHeading: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Why Choose Us Title
                </label>
                <Input
                  value={landingCms.whyChooseHeading}
                  onChange={(e) =>
                    setLandingCms((prev) => ({
                      ...prev,
                      whyChooseHeading: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Add, reorder, or edit Product Landing Hero Slides.
              </span>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nextIdx = landingCms.heroSlides.length + 1;
                  const preset =
                    PRODUCT_ASSET_PRESETS[nextIdx % PRODUCT_ASSET_PRESETS.length];
                  setLandingCms((prev) => ({
                    ...prev,
                    heroSlides: [
                      ...prev.heroSlides,
                      {
                        id: `prod-slide-${Date.now()}`,
                        headline: `Architectural Product Series ${nextIdx}`,
                        subheadline:
                          "Precision extruded aluminium framing paired with solar low-E glazing.",
                        image: preset.url,
                      },
                    ],
                  }));
                  setPreviewSlideIdx(landingCms.heroSlides.length);
                }}
              >
                Add Hero Slide
              </Button>
            </div>

            <div className="space-y-3">
              {landingCms.heroSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Slide {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: moveArrayItem(prev.heroSlides, idx, -1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === landingCms.heroSlides.length - 1}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: moveArrayItem(prev.heroSlides, idx, 1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={landingCms.heroSlides.length <= 1}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: prev.heroSlides.filter((s) => s.id !== slide.id),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Headline
                    </label>
                    <Input
                      value={slide.headline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLandingCms((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, headline: val } : s
                          ),
                        }));
                        setPreviewSlideIdx(idx);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subheadline
                    </label>
                    <Input.TextArea
                      rows={2}
                      value={slide.subheadline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLandingCms((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, subheadline: val } : s
                          ),
                        }));
                        setPreviewSlideIdx(idx);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Slide Image URL
                    </label>
                    <Input
                      value={slide.image}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLandingCms((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, image: val } : s
                          ),
                        }));
                        setPreviewSlideIdx(idx);
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-medium cursor-pointer hover:border-[#22577A]">
                      <UploadOutlined />
                      <span>
                        {uploadingKey === slide.id ? "Uploading..." : "Upload Photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUpload(e.target.files[0], slide.id, (url) => {
                              setLandingCms((prev) => ({
                                ...prev,
                                heroSlides: prev.heroSlides.map((s) =>
                                  s.id === slide.id ? { ...s, image: url } : s
                                ),
                              }));
                            });
                          }
                        }}
                      />
                    </label>
                    {PRODUCT_ASSET_PRESETS.slice(0, 6).map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: prev.heroSlides.map((s) =>
                              s.id === slide.id ? { ...s, image: preset.url } : s
                            ),
                          }));
                          setPreviewSlideIdx(idx);
                        }}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] font-medium cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="primary"
                size="large"
                block
                loading={savingLanding}
                icon={<SaveOutlined />}
                onClick={handleSaveLandingSlideshow}
                style={{
                  background: "#22577A",
                  borderColor: "#22577A",
                  fontWeight: 600,
                }}
              >
                Save & Publish Product Landing Slideshow
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: Why Choose Us Infographic CMS */}
        {activeTab === "whychoose" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="why-choose-heading-input"
                  className="block text-xs font-bold text-[#22577A] mb-1"
                >
                  Why Choose Us Section Title
                </label>
                <Input
                  id="why-choose-heading-input"
                  value={landingCms.whyChooseHeading}
                  placeholder="Why Choose Us"
                  onChange={(e) =>
                    setLandingCms((prev) => ({
                      ...prev,
                      whyChooseHeading: e.target.value,
                    }))
                  }
                />
              </div>

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nextNum = landingCms.whyChooseUs.length + 1;
                  setLandingCms((prev) => ({
                    ...prev,
                    whyChooseUs: [
                      ...prev.whyChooseUs,
                      {
                        id: `why-${Date.now()}`,
                        metric: "100%",
                        title: `Engineering Point ${nextNum}`,
                        percent: 90,
                        icon: "craft",
                        accent: "blue",
                      },
                    ],
                  }));
                }}
              >
                Add Infographic Card
              </Button>
            </div>

            <div className="space-y-3">
              {landingCms.whyChooseUs.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Infographic Item {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0}
                        aria-label={`Move ${item.title} Up`}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: moveArrayItem(prev.whyChooseUs, idx, -1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === landingCms.whyChooseUs.length - 1}
                        aria-label={`Move ${item.title} Down`}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: moveArrayItem(prev.whyChooseUs, idx, 1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={landingCms.whyChooseUs.length <= 1}
                        aria-label={`Delete ${item.title}`}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.filter(
                              (w) => w.id !== item.id
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label
                        htmlFor={`why-metric-${item.id}`}
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Key Metric / Value
                      </label>
                      <Input
                        id={`why-metric-${item.id}`}
                        value={item.metric}
                        placeholder="20 mm"
                        onChange={(e) => {
                          const val = e.target.value;
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, metric: val } : w
                            ),
                          }));
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`why-title-${item.id}`}
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Simple Short Title
                      </label>
                      <Input
                        id={`why-title-${item.id}`}
                        value={item.title}
                        placeholder="Slim Sightlines"
                        onChange={(e) => {
                          const val = e.target.value;
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, title: val } : w
                            ),
                          }));
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Infographic Icon
                      </label>
                      <Select
                        value={item.icon}
                        style={{ width: "100%" }}
                        onChange={(val: WhyChooseIcon) =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, icon: val } : w
                            ),
                          }))
                        }
                        options={[
                          { label: "Precision Compass", value: "precision" },
                          { label: "Warranty Shield", value: "shield" },
                          { label: "Acoustic Seal", value: "acoustic" },
                          { label: "Weather Proof", value: "weather" },
                          { label: "Award Craft", value: "craft" },
                          { label: "On-Time Delivery", value: "speed" },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Ring Accent Color
                      </label>
                      <Select
                        value={item.accent}
                        style={{ width: "100%" }}
                        onChange={(val: WhyChooseAccent) =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, accent: val } : w
                            ),
                          }))
                        }
                        options={[
                          { label: "Brand Navy (#22577A)", value: "navy" },
                          { label: "Ocean Blue (#3393B8)", value: "blue" },
                          { label: "Sky Cyan (#5CB6D2)", value: "cyan" },
                          { label: "Signal Red (#E60000)", value: "red" },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>Infographic Ring Fill</span>
                      <span className="tabular-nums text-[#22577A]">
                        {item.percent}%
                      </span>
                    </div>
                    <Slider
                      min={15}
                      max={100}
                      step={1}
                      value={item.percent}
                      onChange={(val) =>
                        setLandingCms((prev) => ({
                          ...prev,
                          whyChooseUs: prev.whyChooseUs.map((w) =>
                            w.id === item.id ? { ...w, percent: val } : w
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="primary"
                size="large"
                block
                loading={savingLanding}
                icon={<SaveOutlined />}
                onClick={handleSaveLandingSlideshow}
                style={{
                  background: "#22577A",
                  borderColor: "#22577A",
                  fontWeight: 600,
                }}
              >
                Save & Publish Why Choose Us Section
              </Button>
            </div>
          </div>
        )}
      </Spin>

      {/* Add / Edit Category + Category Slideshow Modal */}
      <Modal
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        width={780}
        centered
        title={
          <span className="font-bold text-slate-900">
            {editingId ? `Edit Category: ${catName}` : "Add New Product Category"}
          </span>
        }
        footer={[
          <Button key="cancel" onClick={() => setEditorOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={savingCategory}
            icon={<SaveOutlined />}
            onClick={handleSaveCategory}
            style={{ background: "#22577A", borderColor: "#22577A" }}
          >
            {editingId ? "Update Category" : "Create Category"}
          </Button>,
        ]}
      >
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cat-name-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Category Name *
              </label>
              <Input
                id="cat-name-input"
                value={catName}
                placeholder="e.g. Pergolas & Sunrooms"
                onChange={(e) => {
                  const val = e.target.value;
                  setCatName(val);
                  if (!editingId) {
                    setCatSlug(slugifyCategoryName(val));
                  }
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cat-slug-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Landing Page URL Slug
              </label>
              <Input
                id="cat-slug-input"
                value={catSlug}
                placeholder="pergolas-and-sunrooms"
                onChange={(e) => setCatSlug(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="cat-tagline-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Short Tagline
            </label>
            <Input
              id="cat-tagline-input"
              value={catTagline}
              placeholder="Slim-line glass roofs and architectural terrace canopies."
              onChange={(e) => setCatTagline(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="cat-desc-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Category Engineering Description
            </label>
            <Input.TextArea
              id="cat-desc-input"
              rows={2}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cat-specs-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Key Specifications (comma separated)
              </label>
              <Input
                id="cat-specs-input"
                value={catSpecsText}
                onChange={(e) => setCatSpecsText(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-1.5 gap-3">
              <Switch checked={catFeatured} onChange={setCatFeatured} />
              <span className="text-xs font-semibold text-slate-700">
                Featured on Product Landing Page
              </span>
            </div>
          </div>

          {/* Cover Image */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700">
              Category Card Cover Image
            </label>
            <div className="flex items-center gap-3">
              <img
                src={catCoverImage}
                alt="Cover preview"
                referrerPolicy="no-referrer"
                className="w-20 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <Input
                value={catCoverImage}
                onChange={(e) => setCatCoverImage(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-[11px] font-medium cursor-pointer">
                <UploadOutlined />
                <span>
                  {uploadingKey === "cat-cover" ? "Uploading..." : "Upload Cover"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUpload(e.target.files[0], "cat-cover", (url) =>
                        setCatCoverImage(url)
                      );
                    }
                  }}
                />
              </label>
              {PRODUCT_ASSET_PRESETS.slice(0, 8).map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setCatCoverImage(preset.url)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Landing Page Slideshow Configuration */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-bold text-[#22577A]">
                  Category Landing Page Slideshow ({catHeroSlides.length} slides ·{" "}
                  {catSpeedSec}s)
                </div>
                <div className="text-[11px] text-slate-600">
                  Shown as the hero slideshow on /products/category/{catSlug || "slug"}
                </div>
              </div>
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nextNum = catHeroSlides.length + 1;
                  setCatHeroSlides((prev) => [
                    ...prev,
                    {
                      id: `cat-slide-${Date.now()}-${nextNum}`,
                      headline: `${catName || "Category"} Feature ${nextNum}`,
                      subheadline:
                        catTagline ||
                        "Precision engineered aluminium systems built to order.",
                      image:
                        PRODUCT_ASSET_PRESETS[nextNum % PRODUCT_ASSET_PRESETS.length]
                          .url,
                    },
                  ]);
                }}
              >
                Add Slide
              </Button>
            </div>

            <Slider
              min={1.5}
              max={15}
              step={0.5}
              value={catSpeedSec}
              onChange={(val) =>
                setCatSlideshowSpeedMs(clampSlideshowSpeedMs(val * 1000))
              }
            />

            <div className="space-y-3">
              {catHeroSlides.map((slide, sIdx) => (
                <div
                  key={slide.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Category Slide {sIdx + 1}
                    </span>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={catHeroSlides.length <= 1}
                      onClick={() =>
                        setCatHeroSlides((prev) =>
                          prev.filter((item) => item.id !== slide.id)
                        )
                      }
                    />
                  </div>
                  <Input
                    size="small"
                    placeholder="Slide headline"
                    value={slide.headline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCatHeroSlides((prev) =>
                        prev.map((item) =>
                          item.id === slide.id ? { ...item, headline: val } : item
                        )
                      );
                    }}
                  />
                  <Input
                    size="small"
                    placeholder="Slide subtitle"
                    value={slide.subheadline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCatHeroSlides((prev) =>
                        prev.map((item) =>
                          item.id === slide.id ? { ...item, subheadline: val } : item
                        )
                      );
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      size="small"
                      placeholder="Image URL"
                      value={slide.image}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCatHeroSlides((prev) =>
                          prev.map((item) =>
                            item.id === slide.id ? { ...item, image: val } : item
                          )
                        );
                      }}
                    />
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-dashed border-slate-300 text-[11px] cursor-pointer shrink-0">
                      <UploadOutlined />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUpload(e.target.files[0], slide.id, (url) => {
                              setCatHeroSlides((prev) =>
                                prev.map((item) =>
                                  item.id === slide.id ? { ...item, image: url } : item
                                )
                              );
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </AdminPortalShell>
  );
}
