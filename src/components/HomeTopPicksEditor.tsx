import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { message, Popconfirm, Switch } from "antd";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiEdit2,
  FiEye,
  FiImage,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import {
  DEFAULT_DESIGNS_CATALOG,
  normalizeDesignItem,
  sanitizeDesignImages,
  type DesignItem,
} from "../utils/productCatalogHelpers";
import {
  DEFAULT_ACCESSORIES_RIBBON_HEADING,
  DEFAULT_ACCESSORIES_RIBBON_SUBHEADING,
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  DEFAULT_RIBBON_SPEED,
  DEFAULT_TOP_PICKS_HEADING,
  DEFAULT_TOP_PICKS_SUBHEADING,
  HOME_ACCESSORY_IMAGE_PRESETS,
  MAX_RIBBON_SPEED,
  MIN_RIBBON_SPEED,
  clampAccessoriesRibbonSpeed,
  deleteHomeAccessoryRibbonItem,
  getHomeProductDisplayImage,
  moveHomeAccessoryRibbonItem,
  moveSelectedHomeProduct,
  normalizeHomeFeaturedProductsCms,
  resolveSelectedHomeDesigns,
  toggleHomeAccessoryRibbonItemActive,
  toggleSelectedHomeProduct,
  upsertHomeAccessoryRibbonItem,
  type HomeAccessoryRibbonItem,
  type HomeFeaturedProductsCmsPayload,
} from "../utils/homeTopPicksHelpers";

interface HomeTopPicksEditorProps {
  onCountChange?: (count: number) => void;
}

export default function HomeTopPicksEditor({
  onCountChange,
}: HomeTopPicksEditorProps) {
  const [cms, setCms] = useState<HomeFeaturedProductsCmsPayload>(
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const [catalogDesigns, setCatalogDesigns] = useState<DesignItem[]>(() =>
    DEFAULT_DESIGNS_CATALOG.map((d) => normalizeDesignItem(d))
  );
  const [msgApi, msgContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(
    null
  );
  const [uploadingAccessory, setUploadingAccessory] = useState(false);

  const accessoryFormRef = useRef<HTMLFormElement>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const msgApiRef = useRef(msgApi);
  msgApiRef.current = msgApi;

  const [editingAccessoryId, setEditingAccessoryId] = useState<string | null>(
    null
  );
  const [draftAccImage, setDraftAccImage] = useState("/assets/products/door.jpg");
  const [draftAccTitle, setDraftAccTitle] = useState("");
  const [draftAccSubtitle, setDraftAccSubtitle] = useState("");
  const [draftAccLink, setDraftAccLink] = useState("/products/1");
  const [draftAccActive, setDraftAccActive] = useState(true);

  const loadTopPicksCms = useCallback(async () => {
    try {
      setLoading(true);
      const [cmsRes, designsRes] = await Promise.all([
        AxiosConfig.get<{
          data?: Partial<HomeFeaturedProductsCmsPayload>;
          designs?: Partial<DesignItem>[];
        }>("/api/home-featured-products"),
        AxiosConfig.get<{ data?: Partial<DesignItem>[] }>("/designs/all", {
          params: { page: 1, limit: 100 },
        }),
      ]);

      if (cmsRes.data?.data) {
        const normalized = normalizeHomeFeaturedProductsCms(cmsRes.data.data);
        setCms(normalized);
        onCountChangeRef.current?.(normalized.selectedProductIds.length);
      }

      const rawDesigns = Array.isArray(designsRes.data?.data)
        ? designsRes.data.data
        : Array.isArray(cmsRes.data?.designs)
        ? cmsRes.data.designs
        : null;
      if (rawDesigns && rawDesigns.length > 0) {
        setCatalogDesigns(rawDesigns.map((d) => normalizeDesignItem(d)));
      }
    } catch {
      msgApiRef.current.error(
        "Could not load Home Top Picks & Accessories configuration."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopPicksCms();
  }, [loadTopPicksCms]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      const url = data.secure_url || data.url;
      if (url) return url;
    } catch {
      // Fallback to data URL for smaller images
    }
    if (file.type.startsWith("image/") && file.size < 4 * 1024 * 1024) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(typeof reader.result === "string" ? reader.result : null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }
    return null;
  };

  const persistCms = async (
    nextPayload: HomeFeaturedProductsCmsPayload,
    toastText: string
  ) => {
    try {
      setSaving(true);
      const res = await AxiosConfig.put<{
        data?: Partial<HomeFeaturedProductsCmsPayload>;
      }>("/api/home-featured-products", nextPayload);
      const saved = normalizeHomeFeaturedProductsCms(res.data?.data || nextPayload);
      setCms(saved);
      onCountChangeRef.current?.(saved.selectedProductIds.length);
      msgApiRef.current.success(toastText);
    } catch {
      msgApiRef.current.error("Could not save Home Top Picks & Accessories changes.");
    } finally {
      setSaving(false);
    }
  };

  const selectedDesigns = useMemo(
    () => resolveSelectedHomeDesigns(cms.selectedProductIds, catalogDesigns, 6),
    [cms.selectedProductIds, catalogDesigns]
  );

  const selectedKeySet = useMemo(
    () => new Set(cms.selectedProductIds.map((id) => String(id))),
    [cms.selectedProductIds]
  );

  const handleToggleProduct = async (design: DesignItem) => {
    const idKey = String(design.DesignID);
    const isSelected = selectedKeySet.has(idKey);
    if (isSelected && cms.selectedProductIds.length <= 1) {
      msgApi.warning("At least one product must stay selected for Home.");
      return;
    }
    const nextIds = toggleSelectedHomeProduct(
      cms.selectedProductIds,
      design.DesignID
    );
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      selectedProductIds: nextIds,
    });
    setCms(nextCms);
    await persistCms(
      nextCms,
      isSelected
        ? `Removed "${design.Design_Name}" from Home.`
        : `Added "${design.Design_Name}" to Home Top Picks!`
    );
  };

  const handleMoveSelectedProduct = async (
    index: number,
    direction: -1 | 1
  ) => {
    const movedIds = moveSelectedHomeProduct(
      cms.selectedProductIds,
      index,
      direction
    );
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      selectedProductIds: movedIds,
    });
    setCms(nextCms);
    await persistCms(nextCms, "Home product order updated & published!");
  };

  const handleProductOverrideImage = async (
    designId: string | number,
    url: string,
    toastText?: string
  ) => {
    const key = String(designId);
    const nextOverrides = { ...cms.productImageOverrides };
    if (url.trim()) {
      nextOverrides[key] = url.trim();
    } else {
      delete nextOverrides[key];
    }
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      productImageOverrides: nextOverrides,
    });
    setCms(nextCms);
    if (toastText) {
      await persistCms(nextCms, toastText);
    }
  };

  const handleUploadProductPhoto = async (
    designId: string | number,
    file: File | undefined
  ) => {
    if (!file) return;
    const key = String(designId);
    setUploadingProductId(key);
    const uploadedUrl = await uploadImageFile(file);
    setUploadingProductId(null);
    if (!uploadedUrl) {
      msgApi.error(
        "Photo upload failed. Please try a smaller image or paste an image URL."
      );
      return;
    }
    await handleProductOverrideImage(
      designId,
      uploadedUrl,
      "Custom Home product photo uploaded & published!"
    );
  };

  const handleUploadAccessoryPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAccessory(true);
    const uploadedUrl = await uploadImageFile(file);
    setUploadingAccessory(false);
    if (!uploadedUrl) {
      msgApi.error(
        "Accessory image upload failed. Please try a smaller image or paste a URL."
      );
      return;
    }
    setDraftAccImage(uploadedUrl);
    msgApi.success("Accessory image uploaded! Review title and save.");
  };

  const resetAccessoryDraftForm = () => {
    setEditingAccessoryId(null);
    setDraftAccImage("/assets/products/door.jpg");
    setDraftAccTitle("");
    setDraftAccSubtitle("");
    setDraftAccLink("/products/1");
    setDraftAccActive(true);
  };

  const handleStartEditAccessory = (item: HomeAccessoryRibbonItem) => {
    setEditingAccessoryId(item.id);
    setDraftAccImage(item.image);
    setDraftAccTitle(item.title);
    setDraftAccSubtitle(item.subtitle);
    setDraftAccLink(item.linkTo || "/products");
    setDraftAccActive(item.active !== false);
    accessoryFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const handleSubmitAccessory = async (e: FormEvent) => {
    e.preventDefault();
    if (!draftAccTitle.trim()) {
      msgApi.error("Please enter an accessory title.");
      return;
    }
    if (!draftAccImage.trim()) {
      msgApi.error("Please upload or choose an accessory image.");
      return;
    }

    const nextItems = upsertHomeAccessoryRibbonItem(
      cms.accessoriesRibbonItems,
      {
        title: draftAccTitle.trim(),
        subtitle: draftAccSubtitle.trim(),
        image: draftAccImage.trim(),
        linkTo: draftAccLink.trim() || "/products",
        active: draftAccActive,
      },
      editingAccessoryId
    );
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      accessoriesRibbonItems: nextItems,
    });
    await persistCms(
      nextCms,
      editingAccessoryId
        ? "Accessory ribbon image updated & published!"
        : "New accessory image added to Home ribbon!"
    );
    resetAccessoryDraftForm();
  };

  const handleDeleteAccessory = async (item: HomeAccessoryRibbonItem) => {
    if (cms.accessoriesRibbonItems.length <= 1) {
      msgApi.warning("At least one accessory image must remain in the ribbon.");
      return;
    }
    const nextItems = deleteHomeAccessoryRibbonItem(
      cms.accessoriesRibbonItems,
      item.id
    );
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      accessoriesRibbonItems: nextItems,
    });
    if (editingAccessoryId === item.id) {
      resetAccessoryDraftForm();
    }
    await persistCms(nextCms, `Removed "${item.title}" from ribbon.`);
  };

  const handleMoveAccessory = async (index: number, direction: -1 | 1) => {
    const moved = moveHomeAccessoryRibbonItem(
      cms.accessoriesRibbonItems,
      index,
      direction
    );
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      accessoriesRibbonItems: moved,
    });
    setCms(nextCms);
    await persistCms(nextCms, "Accessory ribbon order updated!");
  };

  const handleToggleAccessoryActive = async (itemId: string) => {
    const toggled = toggleHomeAccessoryRibbonItemActive(
      cms.accessoriesRibbonItems,
      itemId
    );
    const nextCms = normalizeHomeFeaturedProductsCms({
      ...cms,
      accessoriesRibbonItems: toggled,
    });
    setCms(nextCms);
    await persistCms(nextCms, "Accessory visibility updated!");
  };

  const handleSaveAll = async () => {
    await persistCms(
      normalizeHomeFeaturedProductsCms(cms),
      "Home Top Picks & Accessories Ribbon published!"
    );
  };

  const handleResetDefaults = async () => {
    await persistCms(
      DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
      "Home Top Picks & Accessories Ribbon restored to defaults."
    );
    resetAccessoryDraftForm();
  };

  const editingAccIndex = editingAccessoryId
    ? cms.accessoriesRibbonItems.findIndex((a) => a.id === editingAccessoryId)
    : -1;

  return (
    <div className="space-y-8">
      {msgContextHolder}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Selected Home Products ({selectedDesigns.length}) &amp; Accessories Ribbon ({cms.accessoriesRibbonItems.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose which catalog products appear in &ldquo;Our Top Picks&rdquo; on Home, customize their photos, and manage the Accessories Ribbon slideshow directly below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] px-3 py-2 text-xs font-semibold text-[#22577A] no-underline transition-colors"
          >
            <FiEye className="text-xs" />
            <span>Preview Home Section</span>
          </Link>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer transition-colors"
          >
            <FiRotateCcw className="text-xs" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-60"
          >
            <FiSave className="text-xs" />
            <span>{saving ? "Saving..." : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Selected Products on Home ("Our Top Picks") */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              1. Selected Products on Home (&ldquo;Our Top Picks&rdquo;)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which products display on Home, adjust their order, or override a card&apos;s photo.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#22577A]">
            {selectedDesigns.length} selected for Home
          </span>
        </div>

        {/* Heading & Subheading */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="home-top-picks-heading"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Section Heading
            </label>
            <input
              id="home-top-picks-heading"
              type="text"
              value={cms.heading}
              onChange={(e) =>
                setCms((prev) => ({ ...prev, heading: e.target.value }))
              }
              placeholder={DEFAULT_TOP_PICKS_HEADING}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#3393B8]"
            />
          </div>
          <div>
            <label
              htmlFor="home-top-picks-subheading"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Section Subheading
            </label>
            <input
              id="home-top-picks-subheading"
              type="text"
              value={cms.subheading}
              onChange={(e) =>
                setCms((prev) => ({ ...prev, subheading: e.target.value }))
              }
              placeholder={DEFAULT_TOP_PICKS_SUBHEADING}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#3393B8]"
            />
          </div>
        </div>

        {/* Selected Home Order & Custom Photo Overrides */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Displayed Order on Home ({selectedDesigns.length})
            </h5>
            <span className="text-[11px] text-slate-500">
              Cards render left-to-right in this order
            </span>
          </div>

          <div
            className="space-y-2.5"
            data-testid="selected-home-products-list"
          >
            {selectedDesigns.map((design, idx) => {
              const idKey = String(design.DesignID);
              const hasOverride = Boolean(
                cms.productImageOverrides[idKey]?.trim()
              );
              const previewImg = getHomeProductDisplayImage(
                design,
                cms.productImageOverrides
              );
              const catalogDefaultImg = sanitizeDesignImages(
                design.Design_Image
              )[0];

              return (
                <div
                  key={idKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                >
                  <div className="lg:col-span-2">
                    <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      <img
                        src={previewImg}
                        alt={design.Design_Name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-6 space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-[#22577A]">
                        Home Slot #{idx + 1}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {design.Design_Name}
                      </span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        ({design.Categories?.[0] || "product"})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1 rounded-lg border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-[#22577A] cursor-pointer">
                        <FiUpload className="text-[11px]" />
                        <span>
                          {uploadingProductId === idKey
                            ? "Uploading..."
                            : "Upload Custom Photo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handleUploadProductPhoto(
                              design.DesignID,
                              e.target.files?.[0]
                            );
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        aria-label={`Custom Home Image URL for ${design.Design_Name}`}
                        value={cms.productImageOverrides[idKey] || ""}
                        onChange={(e) =>
                          handleProductOverrideImage(
                            design.DesignID,
                            e.target.value
                          )
                        }
                        placeholder={`Catalog photo: ${catalogDefaultImg}`}
                        className="flex-1 min-w-[180px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#3393B8]"
                      />
                      {hasOverride && (
                        <button
                          type="button"
                          onClick={() =>
                            handleProductOverrideImage(
                              design.DesignID,
                              "",
                              `Restored default catalog photo for "${design.Design_Name}".`
                            )
                          }
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-[11px] font-semibold text-slate-600 cursor-pointer"
                        >
                          Reset to Catalog Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-wrap lg:justify-end items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      aria-label={`Move ${design.Design_Name} Up`}
                      onClick={() => handleMoveSelectedProduct(idx, -1)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                    >
                      <FiArrowUp className="text-xs" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedDesigns.length - 1}
                      aria-label={`Move ${design.Design_Name} Down`}
                      onClick={() => handleMoveSelectedProduct(idx, 1)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                    >
                      <FiArrowDown className="text-xs" />
                    </button>
                    <button
                      type="button"
                      disabled={selectedDesigns.length <= 1}
                      aria-label={`Remove ${design.Design_Name} from Home`}
                      onClick={() => handleToggleProduct(design)}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-40 text-xs font-semibold text-red-600 cursor-pointer"
                    >
                      <FiTrash2 className="text-xs" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Catalog Product Picker */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              All Catalog Products ({catalogDesigns.length})
            </h5>
            <span className="text-[11px] text-slate-500">
              Click any product to include or remove it from Home
            </span>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            data-testid="catalog-products-picker"
          >
            {catalogDesigns.map((design) => {
              const idKey = String(design.DesignID);
              const isSelected = selectedKeySet.has(idKey);
              const imgUrl = getHomeProductDisplayImage(
                design,
                cms.productImageOverrides
              );

              return (
                <div
                  key={idKey}
                  className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? "border-[#3393B8] bg-sky-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img
                      src={imgUrl}
                      alt={design.Design_Name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {design.Design_Name}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize truncate">
                      {design.Categories?.[0] || "Architectural System"}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      isSelected
                        ? `Unselect ${design.Design_Name} from Home`
                        : `Select ${design.Design_Name} for Home`
                    }
                    onClick={() => handleToggleProduct(design)}
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#22577A] text-white hover:bg-[#19435E]"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-[#22577A]"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <FiCheck className="text-xs" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <FiPlus className="text-xs" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: Accessories Ribbon Slideshow (Below Top Picks) */}
      <div className="space-y-4">
        {/* Ribbon Settings Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                2. Accessories Ribbon Slideshow (Below Top Picks)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure the continuous horizontal accessories ribbon displayed directly beneath Selected Products on Home.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <Switch
                size="small"
                checked={cms.showAccessoriesRibbon}
                onChange={(checked) =>
                  setCms((prev) => ({
                    ...prev,
                    showAccessoriesRibbon: checked,
                  }))
                }
              />
              <span>Show Ribbon on Home</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="home-ribbon-heading"
                className="block text-[11px] font-bold text-slate-600 mb-1"
              >
                Ribbon Heading
              </label>
              <input
                id="home-ribbon-heading"
                type="text"
                value={cms.accessoriesRibbonHeading}
                onChange={(e) =>
                  setCms((prev) => ({
                    ...prev,
                    accessoriesRibbonHeading: e.target.value,
                  }))
                }
                placeholder={DEFAULT_ACCESSORIES_RIBBON_HEADING}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="home-ribbon-subheading"
                className="block text-[11px] font-bold text-slate-600 mb-1"
              >
                Ribbon Subheading
              </label>
              <input
                id="home-ribbon-subheading"
                type="text"
                value={cms.accessoriesRibbonSubheading}
                onChange={(e) =>
                  setCms((prev) => ({
                    ...prev,
                    accessoriesRibbonSubheading: e.target.value,
                  }))
                }
                placeholder={DEFAULT_ACCESSORIES_RIBBON_SUBHEADING}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="home-ribbon-speed"
                className="block text-[11px] font-bold text-slate-600 mb-1"
              >
                Ribbon Scroll Speed ({cms.accessoriesRibbonSpeed} px/s)
              </label>
              <input
                id="home-ribbon-speed"
                type="range"
                min={MIN_RIBBON_SPEED}
                max={MAX_RIBBON_SPEED}
                step={5}
                value={cms.accessoriesRibbonSpeed}
                onChange={(e) =>
                  setCms((prev) => ({
                    ...prev,
                    accessoriesRibbonSpeed: clampAccessoriesRibbonSpeed(
                      Number(e.target.value),
                      DEFAULT_RIBBON_SPEED
                    ),
                  }))
                }
                className="w-full accent-[#22577A] mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Add / Edit Accessory Image Form */}
        <form
          ref={accessoryFormRef}
          onSubmit={handleSubmitAccessory}
          data-testid="home-accessory-editor-form"
          className={`rounded-2xl border bg-white p-4 sm:p-5 space-y-4 shadow-xs transition-colors ${
            editingAccessoryId
              ? "border-[#3393B8] ring-2 ring-[#3393B8]/15"
              : "border-slate-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">
              {editingAccessoryId
                ? `Editing Accessory Image #${editingAccIndex >= 0 ? editingAccIndex + 1 : ""}`
                : "Add Accessory Image to Ribbon Slideshow"}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Upload, pick a preset, edit, or reorder items in the Home ribbon
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Image Preview & Upload */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {draftAccImage ? (
                  <img
                    src={draftAccImage}
                    alt={draftAccTitle || "Accessory preview"}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No accessory image selected
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 px-3 py-2 text-xs font-semibold text-[#22577A] cursor-pointer transition-colors">
                  <FiUpload className="text-xs" />
                  <span>
                    {uploadingAccessory ? "Uploading..." : "Upload Photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleUploadAccessoryPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <FiImage className="text-xs" />
                  Hardware close-up or finish swatch
                </span>
              </div>

              <div>
                <label
                  htmlFor="home-acc-preset"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  Or Pick Existing Accessory Image
                </label>
                <select
                  id="home-acc-preset"
                  value={
                    HOME_ACCESSORY_IMAGE_PRESETS.some(
                      (p) => p.url === draftAccImage
                    )
                      ? draftAccImage
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) setDraftAccImage(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#3393B8]"
                >
                  <option value="">Choose a preset accessory image...</option>
                  {HOME_ACCESSORY_IMAGE_PRESETS.map((preset) => (
                    <option key={preset.url} value={preset.url}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Accessory Details */}
            <div className="lg:col-span-7 space-y-3">
              <div>
                <label
                  htmlFor="home-acc-image-url"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Accessory Image URL
                </label>
                <input
                  id="home-acc-image-url"
                  type="text"
                  value={draftAccImage}
                  onChange={(e) => setDraftAccImage(e.target.value)}
                  placeholder="/assets/products/door.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#3393B8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="home-acc-title"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Accessory Title
                  </label>
                  <input
                    id="home-acc-title"
                    type="text"
                    value={draftAccTitle}
                    onChange={(e) => setDraftAccTitle(e.target.value)}
                    placeholder="e.g. Matte Charcoal Lift Handle"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="home-acc-subtitle"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Subtitle / Hardware Code
                  </label>
                  <input
                    id="home-acc-subtitle"
                    type="text"
                    value={draftAccSubtitle}
                    onChange={(e) => setDraftAccSubtitle(e.target.value)}
                    placeholder="e.g. INV-HND-01 · Powder Matte Black"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="home-acc-link"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Target Product Link
                </label>
                <input
                  id="home-acc-link"
                  type="text"
                  value={draftAccLink}
                  onChange={(e) => setDraftAccLink(e.target.value)}
                  placeholder="/products/1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#3393B8]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <Switch
                    size="small"
                    checked={draftAccActive}
                    onChange={(checked) => setDraftAccActive(checked)}
                  />
                  <span>Show live in ribbon</span>
                </label>

                <div className="flex items-center gap-2">
                  {editingAccessoryId && (
                    <button
                      type="button"
                      onClick={resetAccessoryDraftForm}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50"
                    >
                      <FiX className="text-xs" />
                      <span>Cancel Edit</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#22577A] hover:bg-[#19435E] px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
                  >
                    {editingAccessoryId ? (
                      <FiSave className="text-xs" />
                    ) : (
                      <FiPlus className="text-xs" />
                    )}
                    <span>
                      {editingAccessoryId
                        ? "Update Accessory"
                        : "Add Accessory Image"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Published Accessory Ribbon Items List */}
        <div className="space-y-3" data-testid="home-accessories-list">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              Ribbon Images ({cms.accessoriesRibbonItems.length})
            </h4>
            <span className="text-xs text-slate-500">
              {cms.accessoriesRibbonItems.filter((a) => a.active !== false).length}{" "}
              visible on Home
            </span>
          </div>

          <div className="space-y-2.5">
            {cms.accessoriesRibbonItems.map((item, idx) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-3.5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-colors ${
                  item.active === false
                    ? "border-amber-200 bg-amber-50/35"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="md:col-span-2">
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="md:col-span-6 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-[#22577A]">
                      Accessory #{idx + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.active === false ? "Hidden" : "Visible"}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-slate-600 truncate m-0">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                <div className="md:col-span-4 flex flex-wrap md:justify-end items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    aria-label={`Move Accessory ${idx + 1} Up`}
                    onClick={() => handleMoveAccessory(idx, -1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <FiArrowUp className="text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === cms.accessoriesRibbonItems.length - 1}
                    aria-label={`Move Accessory ${idx + 1} Down`}
                    onClick={() => handleMoveAccessory(idx, 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <FiArrowDown className="text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAccessoryActive(item.id)}
                    className="px-2.5 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {item.active === false ? "Show" : "Hide"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit Accessory ${idx + 1}: ${item.title}`}
                    onClick={() => handleStartEditAccessory(item)}
                    className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 text-xs font-semibold text-[#22577A] cursor-pointer"
                  >
                    <FiEdit2 className="text-xs" />
                    <span>Edit</span>
                  </button>
                  <Popconfirm
                    title={`Delete "${item.title}"?`}
                    okText="Delete"
                    cancelText="Cancel"
                    onConfirm={() => handleDeleteAccessory(item)}
                  >
                    <button
                      type="button"
                      disabled={cms.accessoriesRibbonItems.length <= 1}
                      aria-label={`Delete Accessory ${idx + 1}: ${item.title}`}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-40 text-xs font-semibold text-red-600 cursor-pointer"
                    >
                      <FiTrash2 className="text-xs" />
                      <span>Delete</span>
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
