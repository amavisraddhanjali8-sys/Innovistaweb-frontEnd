import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  App as AntdApp,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Space,
} from "antd";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCheck,
  FiEye,
  FiImage,
  FiLink,
  FiPlus,
  FiSliders,
  FiStar,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import AdminPortalShell from "../../components/AdminPortalShell";
import SafeImage from "../../components/SafeImage";
import ViewallProjects from "./ViewallProjects";
import AxiosConfig from "../../Context/AxiosConfig";
import { formatCurrencyLkr } from "../../utils/adminPortalHelpers";
import {
  MAX_PROJECT_IMAGES,
  sanitizeProjectImages,
} from "../../../../shared/projectValidation";
import type { ProjectShowcaseItem } from "../../utils/projectShowcaseHelpers";

const { TextArea } = Input;

interface ProjectFormValues {
  Project_Title: string;
  Project_Description: string;
  Location: string;
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Client_Company?: string;
  Project_FinishedDate?: dayjs.Dayjs | null;
  Budget: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function AddProjects() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<ProjectFormValues>();

  const [images, setImages] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  const [activeTab, setActiveTab] = useState<"portfolio" | "form">("portfolio");
  const [editingProject, setEditingProject] =
    useState<ProjectShowcaseItem | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [projectStats, setProjectStats] = useState({
    total: 4,
    budget: 44000000,
  });

  const populateFormForProject = (project: ProjectShowcaseItem | null) => {
    if (!project) {
      form.resetFields();
      setImages([]);
      setUrlDraft("");
      return;
    }

    form.setFieldsValue({
      Project_Title: project.Project_Title || "",
      Project_Description: project.Project_Description || "",
      Location: project.Location || "",
      Client_Name: project.Client_Name || "",
      Client_Email: project.Client_Email || "",
      Client_Number: project.Client_Number || "",
      Client_Company: project.Client_Company || "",
      Project_FinishedDate: project.Project_FinishedDate
        ? dayjs(project.Project_FinishedDate)
        : null,
      Budget: Number(project.Budget || 0),
    });
    setImages(sanitizeProjectImages(project.Project_Images));
    setUrlDraft("");
  };

  const openAddMode = () => {
    setEditingProject(null);
    populateFormForProject(null);
    setActiveTab("form");
  };

  const openEditMode = (project: ProjectShowcaseItem) => {
    setEditingProject(project);
    populateFormForProject(project);
    setActiveTab("form");
  };

  const returnToPortfolio = () => {
    setEditingProject(null);
    populateFormForProject(null);
    setActiveTab("portfolio");
  };

  const handleImageFilesUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_PROJECT_IMAGES - images.length;
    if (remainingSlots <= 0) {
      message.warning(`Maximum ${MAX_PROJECT_IMAGES} images allowed per project.`);
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      message.warning(
        `Only ${remainingSlots} slot${remainingSlots > 1 ? "s" : ""} available (max ${MAX_PROJECT_IMAGES} images).`
      );
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots);
    setUploading(true);
    const addedUrls: string[] = [];

    try {
      for (const file of filesToProcess) {
        const data = new FormData();
        data.append("file", file);

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: data,
          });
          const result = await res.json();
          if (res.ok && (result.secure_url || result.url)) {
            addedUrls.push(result.secure_url || result.url);
            continue;
          }
        } catch {
          // Fallback to data URL below
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          if (dataUrl) addedUrls.push(dataUrl);
        } catch {
          message.error(`Could not load ${file.name}.`);
        }
      }

      if (addedUrls.length > 0) {
        setImages((prev) => sanitizeProjectImages([...prev, ...addedUrls]));
        message.success(
          `${addedUrls.length} image${addedUrls.length > 1 ? "s" : ""} added.`
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    const cleaned = urlDraft.trim();
    if (!cleaned) return;
    if (images.length >= MAX_PROJECT_IMAGES) {
      message.warning(`Maximum ${MAX_PROJECT_IMAGES} images allowed per project.`);
      return;
    }
    if (images.includes(cleaned)) {
      message.info("Image already added.");
      setUrlDraft("");
      return;
    }
    setImages((prev) => sanitizeProjectImages([...prev, cleaned]));
    setUrlDraft("");
  };

  const removeImageAt = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const setAsCoverImage = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });
  };

  const onFinish = async (values: ProjectFormValues) => {
    const sanitizedImages = sanitizeProjectImages(images);
    const payload = {
      ...values,
      Project_Title: values.Project_Title.trim(),
      Project_Description: values.Project_Description.trim(),
      Location: values.Location.trim(),
      Client_Name: values.Client_Name.trim(),
      Client_Email: values.Client_Email.trim(),
      Client_Number: values.Client_Number?.trim() || "",
      Client_Company: values.Client_Company?.trim() || "",
      Project_Images: sanitizedImages,
      Project_FinishedDate: values.Project_FinishedDate
        ? values.Project_FinishedDate.format("YYYY-MM-DD")
        : null,
      Budget: Number(values.Budget || 0),
    };

    try {
      setSubmitting(true);
      if (editingProject) {
        await AxiosConfig.put("/projects/updateProject", {
          ProjectID: editingProject.ProjectID,
          ...payload,
        });
        message.success("Project updated.");
      } else {
        await AxiosConfig.post("/projects/createProject", payload);
        message.success("Project created.");
      }
      setRefreshTick((t) => t + 1);
      returnToPortfolio();
    } catch {
      message.error(
        editingProject ? "Failed to update project." : "Failed to create project."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const emptySlotCount = Math.max(0, MAX_PROJECT_IMAGES - images.length);
  const isEditing = editingProject !== null;

  return (
    <AdminPortalShell
      sectionTitle="Projects"
      refreshTrigger={refreshTick}
      stats={[
        { label: "Total", value: projectStats.total },
        {
          label: "Budget",
          value: formatCurrencyLkr(projectStats.budget),
          tone: "navy",
        },
        { label: "Showcase", value: "Live", tone: "green" },
      ]}
      actions={[
        {
          label: "Showcase",
          icon: <FiEye className="text-[13px]" />,
          onClick: () => navigate("/projects"),
        },
        {
          label: "About",
          icon: <FiSliders className="text-[13px]" />,
          onClick: () => navigate("/EditVisionMission"),
        },
      ]}
      primaryAction={{
        label: activeTab === "portfolio" ? "Add" : "Portfolio",
        icon:
          activeTab === "portfolio" ? (
            <FiPlus className="text-[13px]" />
          ) : (
            <FiBriefcase className="text-[13px]" />
          ),
        onClick: () =>
          activeTab === "portfolio" ? openAddMode() : returnToPortfolio(),
      }}
    >
      {/* Top Workspace Sub-Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          {activeTab === "form" && (
            <button
              type="button"
              onClick={returnToPortfolio}
              aria-label="Portfolio"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-slate-600 hover:text-[#22577A] flex items-center justify-center cursor-pointer shrink-0"
            >
              <FiArrowLeft className="text-sm" />
            </button>
          )}
          <h2 className="text-sm font-bold text-slate-900 m-0 truncate">
            {activeTab === "portfolio"
              ? "Portfolio"
              : isEditing
              ? `Edit — ${editingProject.Project_Title}`
              : "Add"}
          </h2>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={returnToPortfolio}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "portfolio"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Portfolio ({projectStats.total})
          </button>
          <button
            type="button"
            onClick={openAddMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "form" && !isEditing
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Add
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#22577A] shadow-xs cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {activeTab === "portfolio" ? (
        <ViewallProjects
          refreshTrigger={refreshTick}
          onStatsChange={setProjectStats}
          onEditProject={openEditMode}
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="space-y-6"
          requiredMark="optional"
        >
          {/* Section 1: Project Core Details */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Details
              </span>
              {isEditing && (
                <span className="text-[11px] font-semibold text-[#22577A] tabular-nums">
                  #{editingProject.ProjectID}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Form.Item
                label="Title"
                name="Project_Title"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Title" maxLength={140} />
              </Form.Item>

              <Form.Item
                label="Location"
                name="Location"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Colombo 07, Sri Lanka" maxLength={120} />
              </Form.Item>
            </div>

            <Form.Item
              label="Description"
              name="Project_Description"
              className="mb-0"
              rules={[{ required: true, message: "Required" }]}
            >
              <TextArea
                rows={4}
                maxLength={800}
                showCount
                placeholder="Scope, glazing profile, finishes, and structural details"
              />
            </Form.Item>
          </div>

          {/* Section 2: Project Images (Strict Max 3 Slots) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <FiImage className="text-[#22577A] text-sm" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Images
                </span>
              </div>
              <span
                data-testid="project-images-counter"
                className={`text-xs font-bold tabular-nums ${
                  images.length >= MAX_PROJECT_IMAGES
                    ? "text-emerald-700"
                    : "text-slate-600"
                }`}
              >
                {images.length} / {MAX_PROJECT_IMAGES}
              </span>
            </div>

            {/* 3-Slot Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {images.map((url, idx) => (
                <div
                  key={`${url.slice(0, 48)}-${idx}`}
                  data-testid={`project-image-slot-${idx}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    <SafeImage
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover block"
                    />
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        idx === 0
                          ? "bg-[#22577A] text-white"
                          : "bg-slate-900/75 text-white"
                      }`}
                    >
                      {idx === 0 ? "Cover" : `#${idx + 1}`}
                    </span>
                  </div>

                  <div className="p-2 flex items-center justify-between gap-1.5 bg-white border-t border-slate-200">
                    {idx > 0 ? (
                      <Button
                        size="small"
                        icon={<FiStar className="text-[11px]" />}
                        onClick={() => setAsCoverImage(idx)}
                        className="text-[11px]"
                      >
                        Cover
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 px-1">
                        <FiCheck className="text-[11px]" />
                        Cover
                      </span>
                    )}

                    <Button
                      size="small"
                      danger
                      icon={<FiTrash2 className="text-[11px]" />}
                      onClick={() => removeImageAt(idx)}
                      data-testid={`remove-project-image-${idx}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {Array.from({ length: emptySlotCount }).map((_, slotIdx) => {
                const displayNumber = images.length + slotIdx + 1;
                return (
                  <label
                    key={`empty-slot-${displayNumber}`}
                    className="aspect-[16/10] sm:aspect-auto sm:min-h-[156px] rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:border-[#22577A] hover:bg-sky-50/40 flex flex-col items-center justify-center gap-1.5 p-4 cursor-pointer transition-colors text-center"
                  >
                    <span className="w-9 h-9 rounded-full bg-white border border-slate-200 text-[#22577A] flex items-center justify-center">
                      <FiUpload className="text-sm" />
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {uploading ? "..." : `Upload #${displayNumber}`}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading || images.length >= MAX_PROJECT_IMAGES}
                      className="hidden"
                      onChange={handleImageFilesUpload}
                    />
                  </label>
                );
              })}
            </div>

            {/* Optional Image URL Input when slots remain */}
            {images.length < MAX_PROJECT_IMAGES && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <Input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onPressEnter={(e) => {
                    e.preventDefault();
                    handleAddImageUrl();
                  }}
                  prefix={<FiLink className="text-slate-400 text-xs" />}
                  placeholder="https://... or /assets/..."
                />
                <Button
                  type="default"
                  icon={<FiPlus className="text-xs" />}
                  onClick={handleAddImageUrl}
                  disabled={!urlDraft.trim()}
                >
                  URL
                </Button>
              </div>
            )}
          </div>

          {/* Section 3: Client, Finish Date & Budget */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Client
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
              <Form.Item
                label="Client"
                name="Client_Name"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Client" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="Client_Email"
                rules={[
                  { required: true, message: "Required" },
                  { type: "email", message: "Invalid email" },
                ]}
              >
                <Input placeholder="client@company.com" />
              </Form.Item>

              <Form.Item label="Phone" name="Client_Number">
                <Input placeholder="+94 77 000 0000" />
              </Form.Item>

              <Form.Item label="Company" name="Client_Company">
                <Input placeholder="Company" />
              </Form.Item>

              <Form.Item label="Date" name="Project_FinishedDate">
                <DatePicker
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Budget"
                name="Budget"
                rules={[{ required: true, message: "Required" }]}
              >
                <InputNumber<number>
                  style={{ width: "100%" }}
                  min={0}
                  step={50000}
                  placeholder="0"
                  formatter={(value) =>
                    value !== undefined &&
                    value !== null &&
                    String(value) !== ""
                      ? `RS. ${Number(value).toLocaleString("en-US")}`
                      : ""
                  }
                  parser={(value) =>
                    Number(String(value || "").replace(/[^\d]/g, "")) || 0
                  }
                />
              </Form.Item>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                data-testid="submit-project-btn"
                style={{
                  background: "#22577A",
                  borderColor: "#22577A",
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                {isEditing ? "Update" : "Save"}
              </Button>

              <Button
                onClick={() => populateFormForProject(editingProject)}
                disabled={submitting}
              >
                Reset
              </Button>

              {isEditing && (
                <Button onClick={returnToPortfolio} disabled={submitting}>
                  Cancel
                </Button>
              )}
            </Space>
          </div>
        </Form>
      )}
    </AdminPortalShell>
  );
}

export default AddProjects;
