import { useCallback, useEffect, useState } from "react";
import { Button, Input, Modal, Popconfirm, Select, Spin, message } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import { moveArrayItemToIndex } from "../../../../shared/pageAdsHelpers";
import {
  PORTAL_IMAGE_PRESETS,
  RELATED_PORTALS,
  getCollageTileSpanClass,
  normalizeRelatedPortals,
  sanitizePortalUrl,
  type RelatedPortalItem,
} from "../../../../shared/siteContentHelpers";

const CATEGORY_OPTIONS = [
  { label: "Hardware Partner", value: "Hardware Partner" },
  { label: "Internal Portal", value: "Internal Portal" },
  { label: "Access Hardware", value: "Access Hardware" },
  { label: "CAD & Technical", value: "CAD & Technical" },
  { label: "Glazing Partner", value: "Glazing Partner" },
];

export default function PortalsAdmin() {
  const [portals, setPortals] = useState<RelatedPortalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msgApi, msgContextHolder] = message.useMessage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("Hardware Partner");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftImage, setDraftImage] = useState(PORTAL_IMAGE_PRESETS[0].url);
  const [savingModal, setSavingModal] = useState(false);

  const fetchPortals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get("/api/resources/portals");
      if (Array.isArray(res.data?.data)) {
        setPortals(normalizeRelatedPortals(res.data.data));
      } else {
        setPortals(normalizeRelatedPortals(RELATED_PORTALS));
      }
    } catch {
      msgApi.error("Could not load related portals collage.");
    } finally {
      setLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

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
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleModalImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const url = await uploadImageFile(file);
    setUploading(false);
    if (!url) {
      msgApi.error("Image upload failed.");
      return;
    }
    setDraftImage(url);
    msgApi.success("Collage image uploaded!");
  };

  const openAddModal = () => {
    const preset =
      PORTAL_IMAGE_PRESETS[portals.length % PORTAL_IMAGE_PRESETS.length];
    setEditingId(null);
    setDraftName("");
    setDraftCategory("Hardware Partner");
    setDraftUrl("");
    setDraftSummary("");
    setDraftImage(preset.url);
    setModalOpen(true);
  };

  const openEditModal = (item: RelatedPortalItem) => {
    setEditingId(item.id);
    setDraftName(item.name);
    setDraftCategory(item.category);
    setDraftUrl(item.url);
    setDraftSummary(item.summary);
    setDraftImage(item.image);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    const name = draftName.trim();
    const rawUrl = draftUrl.trim();
    const image = draftImage.trim();

    if (!name) {
      msgApi.error("Please enter a portal title.");
      return;
    }
    if (!rawUrl) {
      msgApi.error("Please enter a destination link URL (e.g. /products or https://...).");
      return;
    }
    if (!image) {
      msgApi.error("Please upload or choose a collage image.");
      return;
    }

    const sanitized = sanitizePortalUrl(rawUrl);
    const payload = {
      name,
      category: draftCategory.trim() || "Hardware Partner",
      url: sanitized.url,
      isExternal: sanitized.isExternal,
      summary: draftSummary.trim(),
      image,
    };

    try {
      setSavingModal(true);
      if (editingId) {
        const res = await AxiosConfig.put(
          `/api/resources/portals/${encodeURIComponent(editingId)}`,
          payload
        );
        if (Array.isArray(res.data?.items)) {
          setPortals(normalizeRelatedPortals(res.data.items));
        } else {
          await fetchPortals();
        }
        msgApi.success(`Updated "${name}" portal tile!`);
      } else {
        const res = await AxiosConfig.post("/api/resources/portals", payload);
        if (Array.isArray(res.data?.items)) {
          setPortals(normalizeRelatedPortals(res.data.items));
        } else {
          await fetchPortals();
        }
        msgApi.success(`Added "${name}" to the portals collage!`);
      }
      setModalOpen(false);
    } catch {
      msgApi.error(
        editingId ? "Failed to update portal tile." : "Failed to add portal tile."
      );
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeleteTile = async (tile: RelatedPortalItem) => {
    try {
      const res = await AxiosConfig.delete(
        `/api/resources/portals/${encodeURIComponent(tile.id)}`
      );
      if (Array.isArray(res.data?.items)) {
        setPortals(normalizeRelatedPortals(res.data.items));
      } else {
        setPortals((prev) => prev.filter((p) => p.id !== tile.id));
      }
      msgApi.success(`Removed "${tile.name}" from collage.`);
    } catch {
      msgApi.error("Failed to remove portal tile.");
    }
  };

  const handleMoveTile = (fromIdx: number, toIdx: number) => {
    setPortals((prev) => moveArrayItemToIndex(prev, fromIdx, toIdx));
  };

  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const res = await AxiosConfig.put("/api/resources/portals", {
        data: portals,
      });
      if (Array.isArray(res.data?.data)) {
        setPortals(normalizeRelatedPortals(res.data.data));
      }
      msgApi.success("Portal collage order & links saved!");
    } catch {
      msgApi.error("Failed to save portal collage.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      setSavingOrder(true);
      const res = await AxiosConfig.put("/api/resources/portals", {
        data: RELATED_PORTALS,
      });
      if (Array.isArray(res.data?.data)) {
        setPortals(normalizeRelatedPortals(res.data.data));
      }
      msgApi.success("Default hardware & portal collage restored.");
    } catch {
      msgApi.error("Failed to restore defaults.");
    } finally {
      setSavingOrder(false);
    }
  };

  const externalCount = portals.filter((p) => p.isExternal).length;
  const internalCount = portals.length - externalCount;

  return (
    <AdminPortalShell
      sectionTitle="Portals"
      stats={[
        { label: "Total", value: portals.length, tone: "navy" },
        { label: "External", value: externalCount },
        { label: "Internal", value: internalCount, tone: "green" },
      ]}
      actions={[
        {
          label: "Save",
          icon: <SaveOutlined />,
          loading: savingOrder,
          onClick: handleSaveOrder,
        },
      ]}
      primaryAction={{
        label: "Add",
        icon: <PlusOutlined />,
        onClick: openAddModal,
      }}
    >
      {msgContextHolder}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Preview
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/#/resources"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] no-underline transition-colors"
                >
                  <EyeOutlined />
                  <span>Resources</span>
                </a>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddModal}
                  style={{ background: "#22577A", borderColor: "#22577A" }}
                >
                  Add
                </Button>
              </div>
            </div>

            {portals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  Empty
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAddModal}
                    style={{ background: "#22577A", borderColor: "#22577A" }}
                  >
                    Add
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRestoreDefaults}
                    loading={savingOrder}
                  >
                    Defaults
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 auto-rows-[160px] gap-3">
                {portals.map((tile, idx) => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => openEditModal(tile)}
                    aria-label={`Preview Edit ${tile.name}`}
                    className={`group relative overflow-hidden rounded-xl border border-slate-200 text-left cursor-pointer p-0 bg-slate-900 ${getCollageTileSpanClass(
                      idx,
                      portals.length
                    )}`}
                  >
                    <img
                      src={tile.image}
                      alt={tile.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-[#22577A] shadow-xs">
                      Edit
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-200">
                        {tile.category}
                      </div>
                      <div className="text-sm font-bold leading-snug truncate">
                        {tile.name}
                      </div>
                      <div className="text-[11px] text-slate-200/90 truncate mt-0.5">
                        {tile.url}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Tiles ({portals.length})
              </h2>
              {portals.length > 0 && (
                <Popconfirm
                  title="Reset tiles to defaults?"
                  okText="Reset"
                  cancelText="Cancel"
                  onConfirm={handleRestoreDefaults}
                >
                  <Button size="small" icon={<ReloadOutlined />}>
                    Defaults
                  </Button>
                </Popconfirm>
              )}
            </div>

            {portals.length > 0 && (
              <div className="space-y-3">
                {portals.map((tile, idx) => (
                  <div
                    key={tile.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <img
                        src={tile.image}
                        alt={tile.name}
                        referrerPolicy="no-referrer"
                        className="w-24 h-16 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#3393B8]">
                            #{idx + 1} · {tile.category}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                            {tile.isExternal ? "External Link" : "Internal Route"}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                          {tile.name}
                        </div>
                        <div className="text-xs text-[#22577A] font-medium truncate flex items-center gap-1 mt-0.5">
                          <LinkOutlined className="text-[11px] shrink-0" />
                          <span className="truncate">{tile.url}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0}
                        onClick={() => handleMoveTile(idx, idx - 1)}
                        aria-label={`Move ${tile.name} up`}
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === portals.length - 1}
                        onClick={() => handleMoveTile(idx, idx + 1)}
                        aria-label={`Move ${tile.name} down`}
                      />
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(tile)}
                        aria-label={`Edit ${tile.name}`}
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title={`Delete "${tile.name}"?`}
                        okText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => handleDeleteTile(tile)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={`Delete ${tile.name}`}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex justify-end border-t border-slate-100">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={savingOrder}
                    onClick={handleSaveOrder}
                    style={{ background: "#22577A", borderColor: "#22577A" }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={
          <span className="font-bold text-slate-900">
            {editingId ? "Edit" : "Add"}
          </span>
        }
        okText={editingId ? "Save" : "Publish"}
        confirmLoading={savingModal}
        onOk={handleSaveModal}
        width={620}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 space-y-2.5">
            <div className="w-full aspect-[16/9] rounded-lg overflow-hidden bg-slate-200 border border-slate-200 relative">
              {draftImage ? (
                <img
                  src={draftImage}
                  alt={draftName || "Portal preview"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  No image selected
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 text-white pointer-events-none">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-200">
                  {draftCategory || "Hardware Partner"}
                </div>
                <div className="text-sm font-bold">
                  {draftName || "Portal Tile Title"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] cursor-pointer">
                <UploadOutlined />
                <span>{uploading ? "Uploading..." : "Upload Collage Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleModalImageUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>

              <Select
                size="small"
                style={{ minWidth: 200 }}
                value={
                  PORTAL_IMAGE_PRESETS.some((p) => p.url === draftImage)
                    ? draftImage
                    : undefined
                }
                placeholder="Or pick architectural photo..."
                options={PORTAL_IMAGE_PRESETS.map((p) => ({
                  label: p.label,
                  value: p.url,
                }))}
                onChange={(val) => setDraftImage(val)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="portal-name-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Portal Title *
              </label>
              <Input
                id="portal-name-input"
                value={draftName}
                placeholder="e.g. Schüco Systems Portal"
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="portal-category-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Category Label
              </label>
              <Select
                id="portal-category-select"
                style={{ width: "100%" }}
                value={draftCategory}
                options={CATEGORY_OPTIONS}
                onChange={(val) => setDraftCategory(val)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="portal-link-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Destination Link URL * (External https://... or Internal /products)
            </label>
            <Input
              id="portal-link-input"
              value={draftUrl}
              placeholder="https://www.schueco.com or /products/category/doors"
              onChange={(e) => setDraftUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="portal-image-url-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Image URL
              </label>
              <Input
                id="portal-image-url-input"
                value={draftImage}
                placeholder="/assets/products/facade-detail.jpg"
                onChange={(e) => setDraftImage(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="portal-summary-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Short Tagline (Optional)
              </label>
              <Input
                id="portal-summary-input"
                value={draftSummary}
                placeholder="e.g. German facade engineering & fittings."
                onChange={(e) => setDraftSummary(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </AdminPortalShell>
  );
}
