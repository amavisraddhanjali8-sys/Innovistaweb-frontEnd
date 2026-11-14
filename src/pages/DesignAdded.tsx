import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App as AntdApp, Button } from "antd";
import { FiCheckCircle, FiFolder, FiLayers, FiList } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import AdminPortalShell from "../components/AdminPortalShell";
import AdminProductDetailFields from "../components/AdminProductDetailFields";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  createEmptyDesignDraft,
  normalizeDesignItem,
  type DesignItem,
  type ProductCategory,
} from "../utils/productCatalogHelpers";

export default function DesignForm() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [createdId, setCreatedId] = useState<string | number | null>(null);
  const [allDesigns, setAllDesigns] = useState<DesignItem[]>(() =>
    DEFAULT_DESIGNS_CATALOG.map((d) => normalizeDesignItem(d))
  );
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>(
    DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ label: c.name, value: c.name }))
  );
  const [formData, setFormData] = useState<DesignItem>(() => createEmptyDesignDraft());

  useEffect(() => {
    Promise.all([
      AxiosConfig.get<{ data?: ProductCategory[] } | ProductCategory[]>(
        "/products/categories"
      ),
      AxiosConfig.get("/designs/all", { params: { page: 1, limit: 100 } }),
    ])
      .then(([catRes, desRes]) => {
        const list = Array.isArray(catRes.data)
          ? catRes.data
          : Array.isArray(catRes.data?.data)
          ? catRes.data.data
          : [];
        if (list.length > 0) {
          setCategoryOptions(
            list.map((c) => ({ label: c.name, value: c.name }))
          );
        }
        if (Array.isArray(desRes.data?.data)) {
          setAllDesigns(
            desRes.data.data.map((d: Partial<DesignItem>) => normalizeDesignItem(d))
          );
        }
      })
      .catch(() => {
        // defaults already populated
      });
  }, [refreshTick]);

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
        setFormData((prev) => ({
          ...prev,
          Design_Image: [...(prev.Design_Image || []), result.secure_url || result.url],
        }));
        message.success("Image uploaded.");
        return;
      }
      message.error("Upload failed");
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFormData((prev) => ({
            ...prev,
            Design_Image: [...(prev.Design_Image || []), e.target!.result as string],
          }));
          message.success("Image loaded.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.Design_Name.trim()) {
      message.warning("Please enter a Product Name.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await AxiosConfig.post("/designs/create", formData);
      const savedId = res.data?.data?.DesignID ?? null;
      setCreatedId(savedId);
      message.success("Product published to catalog.");
      setSubmitted(true);
      setRefreshTick((t) => t + 1);

      setFormData({
        ...createEmptyDesignDraft(),
        Design_Name: "",
        Design_Description: "",
        Design_Image: [],
        Categories: [],
      });
    } catch {
      message.error("Error submitting product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPortalShell
      sectionCode="Product Studio"
      sectionTitle="Add New Product System"
      sectionSubtitle="Publish architectural products with full performance specs, configurations, FAQs, and linked products."
      refreshTrigger={refreshTick}
      bannerLeftLines={[
        { label: "Images Attached", value: String(formData.Design_Image?.length || 0) },
        { label: "Linked Products", value: String(formData.relatedProductIds?.length || 0) },
        { label: "Configs Ready", value: String(formData.configurations?.length || 0) },
      ]}
      headerAction={{
        label: "View All Products",
        icon: <FiList className="text-[13px]" />,
        onClick: () => navigate("/ViewAllDesigns"),
      }}
      railTopAction={{
        label: "Manage Catalog",
        icon: <FiLayers className="text-[13px]" />,
        onClick: () => navigate("/ViewAllDesigns"),
      }}
      railSecondaryLeft={{
        label: "All Products",
        icon: <FiList className="text-[13px]" />,
        onClick: () => navigate("/ViewAllDesigns"),
      }}
      railSecondaryRight={{
        label: "Categories CMS",
        icon: <FiFolder className="text-[13px]" />,
        onClick: () => navigate("/ProductCategoriesAdmin"),
      }}
      railPrimaryAction={{
        label: "Publish Product",
        icon: <FiCheckCircle className="text-[14px]" />,
        loading: submitting,
        onClick: handleSubmit,
      }}
    >
      {submitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl">
            <FiCheckCircle />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Product Added Successfully
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              The new system and its full detail page are now live in the catalog.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {createdId && (
              <Button onClick={() => navigate(`/products/${createdId}`)}>
                Open Live Product Page
              </Button>
            )}
            <Button onClick={() => navigate("/ViewAllDesigns")}>
              Manage All Products
            </Button>
            <Button
              type="primary"
              onClick={() => setSubmitted(false)}
              style={{ background: "#22577A", borderColor: "#22577A" }}
            >
              Add Another Product
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <AdminProductDetailFields
            value={formData}
            onChange={setFormData}
            allDesigns={allDesigns}
            categoryOptions={categoryOptions}
            onUploadImage={handleImageUpload}
          />

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              style={{
                background: "#22577A",
                borderColor: "#22577A",
                height: 42,
                paddingInline: 28,
                fontWeight: 600,
                borderRadius: 10,
              }}
            >
              Publish Product System
            </Button>
          </div>
        </div>
      )}
    </AdminPortalShell>
  );
}