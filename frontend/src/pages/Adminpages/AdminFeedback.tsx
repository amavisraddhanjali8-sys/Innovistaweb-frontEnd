import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Button,
  Input,
  Modal,
  Popconfirm,
  Rate,
  Select,
  Switch,
  Table,
  Tag,
} from "antd";
import {
  FiArrowDown,
  FiArrowUp,
  FiBriefcase,
  FiEdit2,
  FiLayers,
  FiPlus,
  FiSliders,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import SafeImage from "../../components/SafeImage";
import { computeFeedbackMetrics } from "../../utils/adminPortalHelpers";
import {
  CUSTOMER_AVATAR_PRESETS,
  DEFAULT_FEEDBACK_AVATAR,
  buildCustomerFeedbackPayload,
  validateCustomerFeedbackForm,
  type CustomerFeedbackRecord,
} from "../../../../shared/customerFeedbackHelpers";

interface DesignOption {
  DesignID: number | string;
  Design_Name: string;
}

function AdminFeedback() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<CustomerFeedbackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [designOptions, setDesignOptions] = useState<DesignOption[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Add/Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<CustomerFeedbackRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerRole, setCustomerRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_FEEDBACK_AVATAR);
  const [designId, setDesignId] = useState("");
  const [designName, setDesignName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [showOnHome, setShowOnHome] = useState(true);

  const fetchFeedbacks = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await AxiosConfig.get<{
        data?: CustomerFeedbackRecord[];
        total?: number;
        page?: number;
        limit?: number;
      }>("/feedback/allFeedbacks", {
        params: { page, limit },
      });
      setFeedbacks(response.data.data || []);
      setTotal(response.data.total ?? (response.data.data?.length || 0));
      setCurrentPage(response.data.page || page);
      setPageSize(response.data.limit || limit);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      message.error("Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchFeedbacks(1, 10);
    AxiosConfig.get<{ data?: DesignOption[] }>("/designs/all", {
      params: { limit: 100 },
    })
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setDesignOptions(res.data.data);
        }
      })
      .catch(() => {
        // Optional select options
      });
  }, [fetchFeedbacks]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setCustomerName("");
    setCustomerRole("");
    setCompanyName("");
    setAvatarUrl(DEFAULT_FEEDBACK_AVATAR);
    setDesignId("");
    setDesignName("");
    setRating(5);
    setComment("");
    setPhotoUrl("");
    setShowOnHome(true);
    setModalOpen(true);
  };

  const openEditModal = (record: CustomerFeedbackRecord) => {
    setEditingRecord(record);
    setCustomerName(record.Customer?.Cus_Name || "");
    setCustomerRole(record.Customer?.Cus_Role || "");
    setCompanyName(record.Customer?.Cus_CompanyName || "");
    setAvatarUrl(record.Customer?.Cus_Avatar || DEFAULT_FEEDBACK_AVATAR);
    setDesignId(record.Design?.DesignID ? String(record.Design.DesignID) : "");
    setDesignName(record.Design?.Design_Name || "");
    setRating(record.Rating || 5);
    setComment(record.Feed_back_comment || "");
    setPhotoUrl(record.Feed_Back_Images?.[0] || "");
    setShowOnHome(record.showOnHome !== false);
    setModalOpen(true);
  };

  const handleUploadImage = async (
    file: File,
    target: "avatar" | "photo"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      if (target === "avatar") setUploadingAvatar(true);
      else setUploadingPhoto(true);
      const res = await AxiosConfig.post<{ url?: string; imageUrl?: string }>(
        "/api/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const uploaded = res.data?.url || res.data?.imageUrl || "";
      if (uploaded) {
        if (target === "avatar") setAvatarUrl(uploaded);
        else setPhotoUrl(uploaded);
        message.success("Image uploaded.");
      } else {
        message.error("Upload response did not contain an image URL.");
      }
    } catch {
      message.error("Image upload failed.");
    } finally {
      if (target === "avatar") setUploadingAvatar(false);
      else setUploadingPhoto(false);
    }
  };

  const handleSaveFeedback = async () => {
    const matchedDesign = designOptions.find(
      (d) => String(d.DesignID) === designId
    );
    const resolvedDesignName =
      matchedDesign?.Design_Name ||
      designName.trim() ||
      "Custom Architectural Aluminium System";

    const formInput = {
      customerName,
      customerRole,
      companyName,
      avatarUrl,
      designName: resolvedDesignName,
      designId: matchedDesign ? String(matchedDesign.DesignID) : designId || undefined,
      rating,
      comment,
      images: photoUrl.trim() ? [photoUrl.trim()] : [],
      showOnHome,
    };

    const validationError = validateCustomerFeedbackForm(formInput);
    if (validationError) {
      message.warning(validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = buildCustomerFeedbackPayload(
        formInput,
        editingRecord ? editingRecord.displayOrder : 0
      );
      if (editingRecord) {
        await AxiosConfig.put(
          `/feedback/updateFeedback/${editingRecord.Feed_backId}`,
          payload
        );
        message.success("Customer feedback updated.");
      } else {
        await AxiosConfig.post("/feedback/createFeedback", payload);
        message.success("Customer feedback added and linked to Home.");
      }
      setModalOpen(false);
      await fetchFeedbacks(currentPage, pageSize);
    } catch {
      message.error("Could not save customer feedback.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHome = async (
    record: CustomerFeedbackRecord,
    checked: boolean
  ) => {
    try {
      await AxiosConfig.patch(`/feedback/toggleHome/${record.Feed_backId}`, {
        showOnHome: checked,
      });
      setFeedbacks((prev) =>
        prev.map((item) =>
          item.Feed_backId === record.Feed_backId
            ? { ...item, showOnHome: checked }
            : item
        )
      );
      message.success(
        checked
          ? "Displayed on Home page Client Testimonials."
          : "Hidden from Home page."
      );
    } catch {
      message.error("Failed to update Home visibility.");
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= feedbacks.length) return;
    const next = [...feedbacks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setFeedbacks(next);
    try {
      await AxiosConfig.put("/feedback/reorder", {
        orderedIds: next.map((item) => item.Feed_backId),
      });
      message.success("Home display order updated.");
    } catch {
      message.error("Failed to reorder customer feedbacks.");
      fetchFeedbacks(currentPage, pageSize);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await AxiosConfig.delete(`/feedback/deleteFeedback?feedbackId=${id}`);
      message.success("Feedback deleted successfully");
      fetchFeedbacks(currentPage, pageSize);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      message.error("Failed to delete feedback");
    }
  };

  const fbMetrics = computeFeedbackMetrics(feedbacks, total);
  const homeVisibleCount = feedbacks.filter((f) => f.showOnHome !== false).length;

  const columns = [
    {
      title: "Client",
      dataIndex: ["Customer", "Cus_Name"],
      key: "Cus_Name",
      width: 185,
      render: (name: string, record: CustomerFeedbackRecord) => (
        <div className="flex items-center gap-2">
          <img
            src={
              record.Customer?.Cus_Avatar ||
              record.Feed_Back_Images?.[0] ||
              DEFAULT_FEEDBACK_AVATAR
            }
            alt={name}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {name}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
              {[record.Customer?.Cus_Role, record.Customer?.Cus_CompanyName]
                .filter(Boolean)
                .join(" · ") || "Verified Client"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Design",
      dataIndex: ["Design", "Design_Name"],
      key: "Design_Name",
      width: 145,
      render: (name: string) => (
        <span className="text-xs font-medium text-[#22577A] line-clamp-2">
          {name}
        </span>
      ),
    },
    {
      title: "Rating",
      dataIndex: "Rating",
      key: "Rating",
      width: 70,
      render: (ratingVal: number) => (
        <Tag color={ratingVal >= 4 ? "green" : "red"} style={{ fontWeight: 600, marginInlineEnd: 0 }}>
          {ratingVal}/5
        </Tag>
      ),
    },
    {
      title: "Comment",
      dataIndex: "Feed_back_comment",
      key: "Feed_back_comment",
      render: (commentVal: string) => (
        <p className="text-xs text-slate-600 max-w-[175px] line-clamp-2 m-0">
          {commentVal}
        </p>
      ),
    },
    {
      title: "Photo",
      dataIndex: "Feed_Back_Images",
      key: "Feed_Back_Images",
      width: 56,
      render: (images: string[]) => (
        <div className="flex items-center gap-1">
          {images?.length ? (
            images.slice(0, 1).map((img, index) => (
              <SafeImage
                key={index}
                src={img}
                alt={`Feedback photo ${index + 1}`}
                width={36}
                height={36}
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            ))
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      title: "Home",
      dataIndex: "showOnHome",
      key: "showOnHome",
      width: 62,
      render: (_: boolean, record: CustomerFeedbackRecord) => (
        <Switch
          size="small"
          aria-label={`Show ${record.Customer?.Cus_Name} on Home`}
          checked={record.showOnHome !== false}
          onChange={(checked) => handleToggleHome(record, checked)}
        />
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 126,
      align: "right" as const,
      render: (_: unknown, record: CustomerFeedbackRecord, index: number) => (
        <div className="inline-flex items-center gap-1">
          <Button
            size="small"
            icon={<FiArrowUp />}
            disabled={index === 0}
            aria-label="Move feedback up"
            onClick={() => handleMove(index, -1)}
          />
          <Button
            size="small"
            icon={<FiArrowDown />}
            disabled={index === feedbacks.length - 1}
            aria-label="Move feedback down"
            onClick={() => handleMove(index, 1)}
          />
          <Button
            size="small"
            icon={<FiEdit2 />}
            aria-label="Edit feedback"
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete this review?"
            onConfirm={() => handleDelete(record.Feed_backId)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              size="small"
              danger
              icon={<FiTrash2 />}
              aria-label="Delete feedback"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <AdminPortalShell
      sectionTitle="Feedback"
      stats={[
        { label: "Total", value: fbMetrics.total },
        { label: "Home", value: homeVisibleCount, tone: "navy" },
        { label: "Rating", value: `${fbMetrics.averageRating}/5`, tone: "green" },
        { label: "Top", value: fbMetrics.fiveStarCount },
      ]}
      actions={[
        {
          label: "Designs",
          icon: <FiLayers className="text-[13px]" />,
          onClick: () => navigate("/ViewAllDesigns"),
        },
        {
          label: "Projects",
          icon: <FiBriefcase className="text-[13px]" />,
          onClick: () => navigate("/AddProjects"),
        },
        {
          label: "About",
          icon: <FiSliders className="text-[13px]" />,
          onClick: () => navigate("/EditVisionMission?tab=feedbacks"),
        },
      ]}
      primaryAction={{
        label: "Add",
        icon: <FiPlus className="text-[13px]" />,
        onClick: openCreateModal,
      }}
    >
      <Table
        rowKey="Feed_backId"
        dataSource={feedbacks}
        columns={columns}
        loading={loading}
        size="middle"
        scroll={{ x: 640 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          responsive: true,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          onChange: (page, limit) => {
            fetchFeedbacks(page, limit);
          },
        }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width="min(620px, calc(100vw - 24px))"
        title={editingRecord ? "Edit" : "Add"}
        centered
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Name
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Kavinda De Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role
              </label>
              <Input
                value={customerRole}
                onChange={(e) => setCustomerRole(e.target.value)}
                placeholder="Director"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Horizon Hospitality"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rating
              </label>
              <div className="pt-1">
                <Rate value={rating} onChange={(val) => setRating(val || 5)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Design
              </label>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Design"
                style={{ width: "100%" }}
                value={designId || undefined}
                onChange={(val) => {
                  const nextId = val || "";
                  setDesignId(nextId);
                  const found = designOptions.find(
                    (d) => String(d.DesignID) === nextId
                  );
                  if (found) setDesignName(found.Design_Name);
                }}
                options={designOptions.map((d) => ({
                  value: String(d.DesignID),
                  label: d.Design_Name,
                }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Label
              </label>
              <Input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="Acoustic Balconies"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Avatar
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={avatarUrl || DEFAULT_FEEDBACK_AVATAR}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover border border-slate-200"
              />
              <Select
                className="w-full sm:w-[210px]"
                value={
                  CUSTOMER_AVATAR_PRESETS.some((p) => p.url === avatarUrl)
                    ? avatarUrl
                    : undefined
                }
                placeholder="Preset"
                onChange={(val) => setAvatarUrl(val)}
                options={CUSTOMER_AVATAR_PRESETS.map((p) => ({
                  label: p.label,
                  value: p.url,
                }))}
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                <FiUpload className="text-xs" />
                <span>{uploadingAvatar ? "..." : "Upload"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file, "avatar");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Photo
            </label>
            <div className="flex gap-2">
              <Input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="/assets/about/terrace.jpg"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
                <FiUpload className="text-xs" />
                <span>{uploadingPhoto ? "..." : "Upload"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file, "photo");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comment
            </label>
            <Input.TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Quote"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
            <span className="text-xs font-semibold text-slate-800">Home</span>
            <Switch checked={showOnHome} onChange={setShowOnHome} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSaveFeedback}
              style={{ backgroundColor: "#22577A" }}
            >
              {editingRecord ? "Save" : "Publish"}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminPortalShell>
  );
}

export default AdminFeedback;
