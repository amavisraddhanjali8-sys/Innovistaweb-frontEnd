import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Input,
  Popconfirm,
} from "antd";
import {
  FiExternalLink,
  FiEye,
  FiFolder,
  FiLink,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import AdminPortalShell from "../components/AdminPortalShell";
import AdminProductDetailFields from "../components/AdminProductDetailFields";
import SafeImage from "../components/SafeImage";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  normalizeDesignItem,
  type DesignItem,
  type ProductCategory,
} from "../../../shared/productCatalogHelpers";

function ViewAllDesigns() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [allDesignsForLinking, setAllDesignsForLinking] = useState<DesignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [editingDraft, setEditingDraft] = useState<DesignItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>(
    DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ label: c.name, value: c.name }))
  );

  const fetchDesigns = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const [pageRes, allRes] = await Promise.all([
        AxiosConfig.get("/designs/all", { params: { page, limit } }),
        AxiosConfig.get("/designs/all", { params: { page: 1, limit: 100 } }),
      ]);
      const paged = Array.isArray(pageRes.data?.data)
        ? pageRes.data.data.map((d: Partial<DesignItem>) => normalizeDesignItem(d))
        : [];
      const fullList = Array.isArray(allRes.data?.data)
        ? allRes.data.data.map((d: Partial<DesignItem>) => normalizeDesignItem(d))
        : paged;

      setDesigns(paged);
      setAllDesignsForLinking(fullList);
      setTotal(pageRes.data.total || paged.length);
      setCurrentPage(pageRes.data.page || page);
      setPageSize(pageRes.data.limit || limit);
    } catch (err) {
      console.error("Error fetching designs:", err);
      message.error("Failed to fetch designs.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchDesigns(1, 10);
    AxiosConfig.get<{ data?: ProductCategory[] } | ProductCategory[]>(
      "/products/categories"
    )
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        if (list.length > 0) {
          setCategoryOptions(
            list.map((c) => ({ label: c.name, value: c.name }))
          );
        }
      })
      .catch(() => {
        // default already set
      });
  }, [fetchDesigns]);

  const handleDelete = async (designId: number | string) => {
    try {
      await AxiosConfig.delete("/designs/deleteDesign", {
        params: { designId },
      });
      message.success("Product removed from catalog.");
      fetchDesigns(currentPage, pageSize);
    } catch {
      message.error("Could not delete product.");
    }
  };

  const handleEdit = (design: DesignItem) => {
    setEditingDraft(normalizeDesignItem(design));
    setIsModalVisible(true);
  };

  const handleUploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editingDraft) return;

    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (result.secure_url || result.url) {
        setEditingDraft((prev) =>
          prev
            ? {
                ...prev,
                Design_Image: [...(prev.Design_Image || []), result.secure_url || result.url],
              }
            : null
        );
        message.success("Image uploaded.");
        return;
      }
      message.error("Upload failed.");
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setEditingDraft((prev) =>
            prev
              ? {
                  ...prev,
                  Design_Image: [...(prev.Design_Image || []), e.target!.result as string],
                }
              : null
          );
          message.success("Image loaded.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async () => {
    if (!editingDraft) return;
    if (!editingDraft.Design_Name.trim()) {
      message.warning("Product Name is required.");
      return;
    }
    try {
      setSavingEdit(true);
      await AxiosConfig.put("/designs/updateDesign", editingDraft);
      message.success("Product & linked details updated.");
      setIsModalVisible(false);
      setEditingDraft(null);
      fetchDesigns(currentPage, pageSize);
    } catch {
      message.error("Failed to update product.");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredDesigns = designs.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.Design_Name?.toLowerCase().includes(q) ||
      item.Categories?.some((c) => c.toLowerCase().includes(q))
    );
  });

  const columns = [
    {
      title: "Product",
      dataIndex: "Design_Name",
      key: "Design_Name",
      render: (name: string, record: DesignItem) => {
        const thumb = record.Design_Image?.[0];
        return (
          <div className="flex items-center gap-3">
            {thumb ? (
              <SafeImage
                src={thumb}
                alt={name}
                width={48}
                height={48}
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">{name}</div>
              <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[220px]">
                {record.Design_Description}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Categories",
      dataIndex: "Categories",
      key: "Categories",
      render: (cats: string[]) => (
        <div className="flex flex-wrap gap-1">
          {cats?.slice(0, 3).map((c, idx) => (
            <Tag key={idx} style={{ margin: 0, fontSize: 11 }}>
              {c}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Linked",
      dataIndex: "relatedProductIds",
      key: "relatedProductIds",
      render: (ids?: (string | number)[]) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#22577A] tabular-nums">
          <FiLink className="text-[11px]" />
          <span>{ids?.length || 0}</span>
        </span>
      ),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (price?: number) => (
        <span className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">
          {price ? `LKR ${price.toLocaleString()}` : "Quote"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: unknown, record: DesignItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<FiExternalLink />}
            onClick={() => navigate(`/products/${record.DesignID}`)}
          >
            Page
          </Button>
          <Button
            size="small"
            type="primary"
            style={{ background: "#22577A", borderColor: "#22577A" }}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete product?"
            onConfirm={() => handleDelete(record.DesignID)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminPortalShell
      sectionTitle="Designs"
      stats={[
        { label: "Total", value: total },
        { label: "Showing", value: filteredDesigns.length },
        { label: "Catalog", value: "Live", tone: "green" },
        { label: "Sync", value: "Products", tone: "navy" },
      ]}
      actions={[
        {
          label: "Store",
          icon: <FiEye className="text-[13px]" />,
          onClick: () => navigate("/products"),
        },
        {
          label: "Categories",
          icon: <FiFolder className="text-[13px]" />,
          onClick: () => navigate("/ProductCategoriesAdmin"),
        },
      ]}
      primaryAction={{
        label: "Add",
        icon: <FiPlus className="text-[13px]" />,
        onClick: () => navigate("/DesignAdded"),
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 m-0">Catalog</h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {filteredDesigns.length}/{total}
          </span>
        </div>

        <Input
          allowClear
          prefix={<FiSearch className="text-slate-400" />}
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-[260px]"
        />
      </div>

      <Table
        rowKey="DesignID"
        columns={columns}
        dataSource={filteredDesigns}
        loading={loading}
        size="middle"
        scroll={{ x: 680 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          responsive: true,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          onChange: (page, limit) => {
            fetchDesigns(page, limit);
          },
        }}
      />

      <Modal
        title={<span className="font-bold text-slate-900">Product</span>}
        open={isModalVisible}
        width="min(1060px, calc(100vw - 24px))"
        onOk={handleUpdate}
        confirmLoading={savingEdit}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{ style: { background: "#22577A", borderColor: "#22577A" } }}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingDraft(null);
        }}
      >
        {editingDraft && (
          <div className="pt-2">
            <AdminProductDetailFields
              value={editingDraft}
              onChange={setEditingDraft}
              allDesigns={allDesignsForLinking}
              categoryOptions={categoryOptions}
              onUploadImage={handleUploadImage}
            />
          </div>
        )}
      </Modal>
    </AdminPortalShell>
  );
}

export default ViewAllDesigns;
