import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Form,
  Space,
  DatePicker,
  InputNumber,
  message,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { FiBriefcase, FiEye, FiPlus, FiSliders, FiUpload } from "react-icons/fi";
import AdminPortalShell from "../../components/AdminPortalShell";
import ViewallProjects from "./ViewallProjects";
import AxiosConfig from "../../Context/AxiosConfig";
import { formatCurrencyLkr } from "../../utils/adminPortalHelpers";

const { TextArea } = Input;

function AddProjects() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"portfolio" | "add">("portfolio");
  const [refreshTick, setRefreshTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [projectStats, setProjectStats] = useState({
    total: 4,
    budget: 44000000,
  });

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      if (result.secure_url || result.url) {
        setImages((prev) => [...prev, result.secure_url || result.url]);
        message.success("Image uploaded.");
        return;
      }
      message.error("Image upload failed");
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages((prev) => [...prev, e.target!.result as string]);
          message.success("Image loaded.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  interface ProjectFormValues {
    Project_Title: string;
    Project_Description: string;
    Location: string;
    Client_Name: string;
    Client_Email: string;
    Client_Number?: string;
    Client_Company?: string;
    Project_FinishedDate?: { format: (fmt: string) => string } | null;
    Budget: number;
  }

  const onFinish = async (values: ProjectFormValues) => {
    const projectData = {
      ...values,
      Project_Images: images,
      Project_FinishedDate: values.Project_FinishedDate
        ? values.Project_FinishedDate.format("YYYY-MM-DD")
        : null,
    };

    try {
      setSubmitting(true);
      await AxiosConfig.post("/projects/createProject", projectData);
      message.success("Project created successfully.");
      form.resetFields();
      setImages([]);
      setRefreshTick((t) => t + 1);
      setActiveTab("portfolio");
    } catch {
      message.error("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPortalShell
      sectionCode="Portfolio Manager"
      sectionTitle="Architectural Projects"
      sectionSubtitle="Publish completed installations and maintain portfolio records."
      refreshTrigger={refreshTick}
      bannerLeftLines={[
        { label: "Total Projects", value: String(projectStats.total) },
        { label: "Combined Budget", value: formatCurrencyLkr(projectStats.budget) },
        { label: "Visibility", value: "Live on /projects" },
      ]}
      headerAction={{
        label: activeTab === "portfolio" ? "Add New Project" : "View Portfolio",
        icon: activeTab === "portfolio" ? <FiPlus className="text-[13px]" /> : <FiBriefcase className="text-[13px]" />,
        onClick: () =>
          setActiveTab((prev) => (prev === "portfolio" ? "add" : "portfolio")),
      }}
      railTopAction={{
        label: activeTab === "portfolio" ? "+ Add New Project" : "Back to Project List",
        onClick: () =>
          setActiveTab((prev) => (prev === "portfolio" ? "add" : "portfolio")),
      }}
      kpiLabel="Portfolio Value"
      kpiValue={formatCurrencyLkr(projectStats.budget)}
      kpiNote={`${projectStats.total} projects`}
      kpiStatusText="Published to public showcase"
      kpiStatusTone="navy"
      railSecondaryLeft={{
        label: "Live Projects",
        icon: <FiEye className="text-[13px]" />,
        onClick: () => navigate("/projects"),
      }}
      railSecondaryRight={{
        label: "About CMS",
        icon: <FiSliders className="text-[13px]" />,
        onClick: () => navigate("/EditVisionMission"),
      }}
      railPrimaryAction={{
        label: activeTab === "portfolio" ? "+ Add Project" : "View Project List",
        icon: <FiBriefcase className="text-[14px]" />,
        onClick: () =>
          setActiveTab((prev) => (prev === "portfolio" ? "add" : "portfolio")),
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {activeTab === "portfolio" ? "Published Installations" : "Create New Project"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === "portfolio"
              ? "Active commercial and residential case studies."
              : "Upload architectural photography, client details, and project budget."}
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "portfolio"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Projects ({projectStats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "add"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            + Add Project
          </button>
        </div>
      </div>

      {activeTab === "portfolio" ? (
        <ViewallProjects
          refreshTrigger={refreshTick}
          onStatsChange={setProjectStats}
        />
      ) : (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              label="Project Title"
              name="Project_Title"
              rules={[{ required: true }]}
            >
              <Input placeholder="Enter project title" />
            </Form.Item>

            <Form.Item
              label="Location"
              name="Location"
              rules={[{ required: true }]}
            >
              <Input placeholder="Colombo 07, Sri Lanka" />
            </Form.Item>
          </div>

          <Form.Item
            label="Project Description"
            name="Project_Description"
            rules={[{ required: true }]}
          >
            <TextArea rows={3} placeholder="Enter architectural specifications and scope" />
          </Form.Item>

          <Form.Item label="Project Photography">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:border-[#22577A] text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
              <FiUpload />
              <span>Upload Project Image</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {images.map((url) => (
                  <div key={url} className="flex items-center gap-2 border border-slate-200 rounded-xl p-1.5 bg-slate-50">
                    <img
                      src={url}
                      alt="Uploaded"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeImage(url)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              label="Client Name"
              name="Client_Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="Enter client name" />
            </Form.Item>

            <Form.Item
              label="Client Email"
              name="Client_Email"
              rules={[{ required: true }, { type: "email" }]}
            >
              <Input placeholder="client@company.com" />
            </Form.Item>

            <Form.Item label="Client Number" name="Client_Number">
              <Input placeholder="+94 77 000 0000" />
            </Form.Item>

            <Form.Item label="Client Company" name="Client_Company">
              <Input placeholder="Enter company name" />
            </Form.Item>

            <Form.Item label="Project Finished Date" name="Project_FinishedDate">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Budget (LKR)" name="Budget" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                placeholder="Enter budget"
                formatter={(value) => `RS. ${value}`}
              />
            </Form.Item>
          </div>

          <Form.Item className="mb-0 pt-2">
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  background: "#22577A",
                  borderColor: "#22577A",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                Publish Project
              </Button>

              <Button onClick={() => form.resetFields()}>Reset</Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </AdminPortalShell>
  );
}

export default AddProjects;
