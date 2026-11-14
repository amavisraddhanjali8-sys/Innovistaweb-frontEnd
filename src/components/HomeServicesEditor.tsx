import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { message, Popconfirm, Switch } from "antd";
import {
  FiArrowDown,
  FiArrowUp,
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
  DEFAULT_HOME_SERVICES_CMS,
  DEFAULT_SERVICES_HEADING,
  DEFAULT_SERVICES_SUBHEADING,
  SERVICE_IMAGE_PRESETS,
  clampServicesDurationMs,
  deleteHomeService,
  moveHomeService,
  normalizeHomeServicesCms,
  toggleHomeServiceActive,
  upsertHomeService,
  type HomeServiceItem,
  type HomeServicesCmsPayload,
} from "../utils/homeServicesHelpers";

interface HomeServicesEditorProps {
  onCountChange?: (count: number) => void;
}

export default function HomeServicesEditor({
  onCountChange,
}: HomeServicesEditorProps) {
  const [cms, setCms] = useState<HomeServicesCmsPayload>(
    DEFAULT_HOME_SERVICES_CMS
  );
  const [msgApi, msgContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const msgApiRef = useRef(msgApi);
  msgApiRef.current = msgApi;

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [draftImage, setDraftImage] = useState("/assets/serviceImages/image1.jpg");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription1, setDraftDescription1] = useState("");
  const [draftDescription2, setDraftDescription2] = useState("");
  const [draftActive, setDraftActive] = useState(true);

  const loadServicesCms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get<{ data?: Partial<HomeServicesCmsPayload> }>(
        "/api/home-services"
      );
      if (res.data?.data) {
        const normalized = normalizeHomeServicesCms(res.data.data);
        setCms(normalized);
        onCountChangeRef.current?.(normalized.items.length);
      }
    } catch {
      msgApiRef.current.error("Could not load What We Build services configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServicesCms();
  }, [loadServicesCms]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      const url = data.secure_url || data.url;
      if (url) return url;
    } catch {
      // Fallback to small image data URL
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

  const handleUploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploadingImage(true);
    const uploadedUrl = await uploadImageFile(file);
    setUploadingImage(false);
    if (!uploadedUrl) {
      msgApi.error("Image upload failed. Please try a smaller file or paste an image URL.");
      return;
    }
    setDraftImage(uploadedUrl);
    msgApi.success("Image uploaded! Review details and save.");
  };

  const persistCms = async (
    nextPayload: HomeServicesCmsPayload,
    toastText: string
  ) => {
    try {
      setSaving(true);
      const res = await AxiosConfig.put<{ data?: Partial<HomeServicesCmsPayload> }>(
        "/api/home-services",
        nextPayload
      );
      const saved = normalizeHomeServicesCms(res.data?.data || nextPayload);
      setCms(saved);
      onCountChangeRef.current?.(saved.items.length);
      msgApiRef.current.success(toastText);
    } catch {
      msgApiRef.current.error("Could not save What We Build section changes.");
    } finally {
      setSaving(false);
    }
  };

  const resetDraftForm = () => {
    setEditingServiceId(null);
    setDraftImage("/assets/serviceImages/image1.jpg");
    setDraftTitle("");
    setDraftDescription1("");
    setDraftDescription2("");
    setDraftActive(true);
  };

  const handleStartEditService = (item: HomeServiceItem) => {
    setEditingServiceId(item.id);
    setDraftImage(item.image);
    setDraftTitle(item.title);
    setDraftDescription1(item.description1);
    setDraftDescription2(item.description2);
    setDraftActive(item.active !== false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handleSubmitService = async (e: FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) {
      msgApi.error("Please enter a service title.");
      return;
    }
    if (!draftImage.trim()) {
      msgApi.error("Please upload or choose an image.");
      return;
    }
    if (!draftDescription1.trim()) {
      msgApi.error("Please enter the main service description.");
      return;
    }

    const nextItems = upsertHomeService(
      cms.items,
      {
        image: draftImage.trim(),
        title: draftTitle.trim(),
        description1: draftDescription1.trim(),
        description2: draftDescription2.trim(),
        active: draftActive,
      },
      editingServiceId
    );
    const nextCms = normalizeHomeServicesCms({ ...cms, items: nextItems });
    await persistCms(
      nextCms,
      editingServiceId
        ? "Service updated & published!"
        : "New service added & published!"
    );
    resetDraftForm();
  };

  const handleDeleteService = async (item: HomeServiceItem) => {
    if (cms.items.length <= 1) {
      msgApi.warning("At least one service must remain.");
      return;
    }
    const nextItems = deleteHomeService(cms.items, item.id);
    const nextCms = normalizeHomeServicesCms({ ...cms, items: nextItems });
    if (editingServiceId === item.id) {
      resetDraftForm();
    }
    await persistCms(nextCms, `Removed "${item.title}".`);
  };

  const handleMoveService = async (index: number, direction: -1 | 1) => {
    const moved = moveHomeService(cms.items, index, direction);
    const nextCms = normalizeHomeServicesCms({ ...cms, items: moved });
    setCms(nextCms);
    await persistCms(nextCms, "Service order updated & published!");
  };

  const handleToggleServiceActive = async (serviceId: string) => {
    const toggled = toggleHomeServiceActive(cms.items, serviceId);
    const nextCms = normalizeHomeServicesCms({ ...cms, items: toggled });
    setCms(nextCms);
    await persistCms(nextCms, "Service visibility updated!");
  };

  const handleSaveSectionSettings = async () => {
    await persistCms(cms, "Section heading, timing & services published!");
  };

  const handleResetDefaults = async () => {
    await persistCms(
      DEFAULT_HOME_SERVICES_CMS,
      "What We Build section restored to defaults."
    );
    resetDraftForm();
  };

  const durationSeconds = Number((cms.durationMs / 1000).toFixed(1));
  const editingIndex = editingServiceId
    ? cms.items.findIndex((s) => s.id === editingServiceId)
    : -1;

  return (
    <div className="space-y-6">
      {msgContextHolder}

      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            What We Build For You ({cms.items.length} services)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Edit section heading, auto-rotate interval, and add, edit, reorder, or delete service cards shown on the Home page.
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
            onClick={handleSaveSectionSettings}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-60"
          >
            <FiSave className="text-xs" />
            <span>{saving ? "Saving..." : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Service Card Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmitService}
        data-testid="home-service-editor-form"
        className={`rounded-2xl border bg-white p-4 sm:p-5 space-y-4 shadow-xs transition-colors ${
          editingServiceId
            ? "border-[#3393B8] ring-2 ring-[#3393B8]/15"
            : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">
            {editingServiceId
              ? `Editing Service #${editingIndex >= 0 ? editingIndex + 1 : ""}`
              : "Add New Service Card"}
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Displays in the stacked photo carousel &amp; description panel
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Image Preview & Picker */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              {draftImage ? (
                <img
                  src={draftImage}
                  alt={draftTitle || "Service preview"}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  No image selected
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 px-3 py-2 text-xs font-semibold text-[#22577A] cursor-pointer transition-colors">
                <FiUpload className="text-xs" />
                <span>{uploadingImage ? "Uploading..." : "Upload Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <FiImage className="text-xs" />
                Recommended landscape or square photo
              </span>
            </div>

            <div>
              <label
                htmlFor="home-service-preset"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Or Pick Existing Service Image
              </label>
              <select
                id="home-service-preset"
                value={
                  SERVICE_IMAGE_PRESETS.some((p) => p.url === draftImage)
                    ? draftImage
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value) setDraftImage(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#3393B8]"
              >
                <option value="">Choose a preset photo...</option>
                {SERVICE_IMAGE_PRESETS.map((preset) => (
                  <option key={preset.url} value={preset.url}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Form Fields */}
          <div className="lg:col-span-7 space-y-3">
            <div>
              <label
                htmlFor="home-service-image-url"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Image URL
              </label>
              <input
                id="home-service-image-url"
                type="text"
                value={draftImage}
                onChange={(e) => setDraftImage(e.target.value)}
                placeholder="/assets/serviceImages/image1.jpg"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            <div>
              <label
                htmlFor="home-service-title"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Service Title
              </label>
              <input
                id="home-service-title"
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Aluminium and Steel Roofing Solutions"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            <div>
              <label
                htmlFor="home-service-desc1"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Main Description (Paragraph 1)
              </label>
              <textarea
                id="home-service-desc1"
                rows={3}
                value={draftDescription1}
                onChange={(e) => setDraftDescription1(e.target.value)}
                placeholder="Describe the core engineering, materials, and applications..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            <div>
              <label
                htmlFor="home-service-desc2"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Secondary Paragraph (Paragraph 2)
              </label>
              <textarea
                id="home-service-desc2"
                rows={2}
                value={draftDescription2}
                onChange={(e) => setDraftDescription2(e.target.value)}
                placeholder="Installation, customization, waterproofing, or maintenance details..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <Switch
                  size="small"
                  checked={draftActive}
                  onChange={(checked) => setDraftActive(checked)}
                />
                <span>Show service live on Home page</span>
              </label>

              <div className="flex items-center gap-2">
                {editingServiceId && (
                  <button
                    type="button"
                    onClick={resetDraftForm}
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
                  {editingServiceId ? (
                    <FiSave className="text-xs" />
                  ) : (
                    <FiPlus className="text-xs" />
                  )}
                  <span>
                    {editingServiceId ? "Update Service" : "Add Service"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Section Heading & Auto-Rotate Timing */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="pb-2 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">
            Section Heading &amp; Carousel Timing
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Update the title above the brush underline, subtitle, and slide interval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="home-services-heading"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Section Heading
            </label>
            <input
              id="home-services-heading"
              type="text"
              value={cms.heading}
              onChange={(e) =>
                setCms((prev) => ({ ...prev, heading: e.target.value }))
              }
              placeholder={DEFAULT_SERVICES_HEADING}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
            />
          </div>
          <div>
            <label
              htmlFor="home-services-subheading"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Section Subheading
            </label>
            <input
              id="home-services-subheading"
              type="text"
              value={cms.subheading}
              onChange={(e) =>
                setCms((prev) => ({ ...prev, subheading: e.target.value }))
              }
              placeholder={DEFAULT_SERVICES_SUBHEADING}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
            />
          </div>
          <div>
            <label
              htmlFor="home-services-speed"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Auto-Rotate Interval ({durationSeconds}s)
            </label>
            <input
              id="home-services-speed"
              type="range"
              min={3}
              max={30}
              step={1}
              value={durationSeconds}
              onChange={(e) =>
                setCms((prev) => ({
                  ...prev,
                  durationMs: clampServicesDurationMs(
                    Number(e.target.value) * 1000
                  ),
                }))
              }
              className="w-full accent-[#22577A] mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* Published Services List */}
      <div className="space-y-3" data-testid="home-services-list">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            Published Services ({cms.items.length})
          </h4>
          <span className="text-xs text-slate-500">
            {cms.items.filter((s) => s.active !== false).length} visible on Home
          </span>
        </div>

        <div className="space-y-3">
          {cms.items.map((item, idx) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-colors ${
                item.active === false
                  ? "border-amber-200 bg-amber-50/35"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="md:col-span-3">
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
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
                    Service #{idx + 1}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{item.active === false ? "Hidden" : "Visible"}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {item.title}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 m-0">
                  {item.description1}
                </p>
                {item.description2 && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 m-0">
                    {item.description2}
                  </p>
                )}
              </div>

              <div className="md:col-span-3 flex flex-wrap md:justify-end items-center gap-1.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  aria-label={`Move Service ${idx + 1} Up`}
                  onClick={() => handleMoveService(idx, -1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <FiArrowUp className="text-xs" />
                </button>
                <button
                  type="button"
                  disabled={idx === cms.items.length - 1}
                  aria-label={`Move Service ${idx + 1} Down`}
                  onClick={() => handleMoveService(idx, 1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <FiArrowDown className="text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleServiceActive(item.id)}
                  className="px-2.5 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {item.active === false ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  aria-label={`Edit Service ${idx + 1}: ${item.title}`}
                  onClick={() => handleStartEditService(item)}
                  className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 text-xs font-semibold text-[#22577A] cursor-pointer"
                >
                  <FiEdit2 className="text-xs" />
                  <span>Edit</span>
                </button>
                <Popconfirm
                  title={`Delete "${item.title}"?`}
                  okText="Delete"
                  cancelText="Cancel"
                  onConfirm={() => handleDeleteService(item)}
                >
                  <button
                    type="button"
                    disabled={cms.items.length <= 1}
                    aria-label={`Delete Service ${idx + 1}: ${item.title}`}
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
  );
}
