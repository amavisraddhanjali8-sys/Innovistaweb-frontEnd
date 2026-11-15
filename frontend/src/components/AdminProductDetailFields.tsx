import React, { useState } from "react";
import { App as AntdApp, Button, Input, InputNumber, Select, Slider, Tabs } from "antd";
import {
  FiArrowDown,
  FiArrowUp,
  FiDownload,
  FiFileText,
  FiGrid,
  FiLink,
  FiPlus,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import { clampRibbonSpeed, clampSlideshowSpeedMs } from "../../../shared/aboutContentHelpers";
import AxiosConfig from "../Context/AxiosConfig";
import {
  ACCESSORY_BRAND_LOGO_PRESETS,
  DEFAULT_ACCESSORIES_RIBBON_SPEED,
  DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS,
  DEFAULT_CERTIFICATION_IMAGES,
  DEFAULT_CLIENT_SHOWCASES,
  DEFAULT_DOOR_ACCESSORIES,
  DEFAULT_DOOR_FEATURE_TABLE,
  DEFAULT_PARTNER_SERVICES,
  DEFAULT_PERFORMANCE_SPEC,
  DEFAULT_PRODUCT_ADVANTAGES,
  DEFAULT_PRODUCT_CERTIFICATIONS,
  DEFAULT_PRODUCT_CUSTOMIZATIONS,
  DEFAULT_PRODUCT_FAQS,
  DEFAULT_WINDOW_ACCESSORIES,
  MAX_CERTIFICATION_IMAGES,
  PRODUCT_ASSET_PRESETS,
  createEmptyFeatureTable,
  createEmptyPerformanceSpec,
  exportFeatureTableTemplateExcel,
  parseFeatureTableFromExcelArrayBuffer,
  type AccessoryVariantItem,
  type CustomizationCategory,
  type DesignItem,
  type ProductAccessoryGroup,
  type ProductFeatureTable,
  type ProductPerformanceSpec,
} from "../../../shared/productCatalogHelpers";

const { TextArea } = Input;

interface AdminProductDetailFieldsProps {
  value: DesignItem;
  onChange: (next: DesignItem) => void;
  allDesigns: DesignItem[];
  categoryOptions: { label: string; value: string }[];
  onUploadImage?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CUSTOMIZATION_CATEGORIES: { label: string; value: CustomizationCategory }[] = [
  { label: "Color", value: "color" },
  { label: "Glass", value: "glass" },
  { label: "Frame", value: "frame" },
  { label: "Size", value: "size" },
  { label: "Hardware", value: "hardware" },
  { label: "Style", value: "style" },
];

const CONFIG_SUGGESTIONS = [
  "2-2-0",
  "3-3-0",
  "4-1-3",
  "4-2-2",
  "5-5-0",
  "6-1-5",
  "6-3-3",
  "7-0-7",
];

async function uploadAdminImageFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await AxiosConfig.post<{ secure_url?: string; url?: string }>("/api/upload", formData);
    const result = res.data;
    const url = result?.secure_url || result?.url;
    if (typeof url === "string" && url.trim()) {
      return url.trim();
    }
  } catch {
    // fallback to FileReader
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      resolve(typeof ev.target?.result === "string" ? ev.target.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function AdminProductDetailFields({
  value,
  onChange,
  allDesigns,
  categoryOptions,
}: AdminProductDetailFieldsProps) {
  const { message } = AntdApp.useApp();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const perf = value.performance || createEmptyPerformanceSpec();
  const featureTable: ProductFeatureTable = value.featureTable || createEmptyFeatureTable();
  const certImages = value.certificationImages || [];
  const accessories = value.accessories || [];

  const slideshowSeconds =
    Math.round(
      ((value.accessoriesSlideshowSpeedMs || DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS) / 1000) * 10
    ) / 10;
  const ribbonSpeed = value.accessoriesRibbonSpeed || DEFAULT_ACCESSORIES_RIBBON_SPEED;

  const updatePerformance = (field: keyof ProductPerformanceSpec, nextVal: string) => {
    onChange({
      ...value,
      performance: {
        ...perf,
        [field]: nextVal,
      },
    });
  };

  const handleSingleImageUpload = async (
    file: File | undefined,
    key: string,
    applyUrl: (url: string) => void
  ) => {
    if (!file) return;
    setUploadingKey(key);
    const url = await uploadAdminImageFile(file);
    setUploadingKey(null);
    if (url) {
      applyUrl(url);
      message.success("Image uploaded.");
    } else {
      message.error("Could not upload image.");
    }
  };

  const handleMultiGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingKey("gallery-multi");
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadAdminImageFile(file);
      if (url) uploaded.push(url);
    }
    setUploadingKey(null);
    if (uploaded.length > 0) {
      onChange({
        ...value,
        Design_Image: [...(value.Design_Image || []), ...uploaded],
      });
      message.success(
        `${uploaded.length} gallery ${uploaded.length === 1 ? "photo" : "photos"} uploaded.`
      );
    } else {
      message.error("Image upload failed.");
    }
  };

  const handleMultiCertImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_CERTIFICATION_IMAGES - certImages.length;
    if (remaining <= 0) {
      message.warning(`Maximum of ${MAX_CERTIFICATION_IMAGES} certification images reached.`);
      return;
    }

    const picked = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      message.info(
        `Only ${remaining} remaining slot${remaining === 1 ? "" : "s"} available (max ${MAX_CERTIFICATION_IMAGES} images).`
      );
    }

    setUploadingKey("cert-multi");
    const newItems = [];
    for (let i = 0; i < picked.length; i += 1) {
      const file = picked[i];
      const url = await uploadAdminImageFile(file);
      if (url) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
        newItems.push({
          id: `certimg-${Date.now()}-${i}`,
          title: cleanTitle || `Certificate ${certImages.length + newItems.length + 1}`,
          image: url,
        });
      }
    }
    setUploadingKey(null);

    if (newItems.length > 0) {
      onChange({
        ...value,
        certificationImages: [...certImages, ...newItems].slice(0, MAX_CERTIFICATION_IMAGES),
      });
      message.success(
        `${newItems.length} certification ${newItems.length === 1 ? "image" : "images"} uploaded.`
      );
    } else {
      message.error("Could not upload certification image.");
    }
  };

  const handleExcelUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseFeatureTableFromExcelArrayBuffer(buffer);
      if (parsed.headers.length === 0) {
        message.warning("No readable columns were found in the uploaded spreadsheet.");
        return;
      }
      onChange({
        ...value,
        featureTable: {
          title: parsed.title || featureTable.title || `${value.Design_Name || "System"} Matrix`,
          headers: parsed.headers,
          rows: parsed.rows,
        },
      });
      message.success(
        `Imported ${parsed.headers.length} columns and ${parsed.rows.length} rows from Excel.`
      );
    } catch {
      message.error("Could not read spreadsheet. Please use a valid .xlsx, .xls, or .csv file.");
    }
  };

  const setTable = (nextTable: ProductFeatureTable) => {
    onChange({
      ...value,
      featureTable: nextTable,
    });
  };

  const addTableColumn = () => {
    const nextHeaders =
      featureTable.headers.length > 0
        ? [...featureTable.headers, `Column ${featureTable.headers.length + 1}`]
        : ["Specification", "Standard Value", "Heavy-Duty Option"];
    const nextRows =
      featureTable.rows.length > 0
        ? featureTable.rows.map((r) => [
            ...r,
            ...Array(Math.max(0, nextHeaders.length - r.length)).fill(""),
          ])
        : [nextHeaders.map(() => "")];
    setTable({
      title: featureTable.title || "System Specification Comparison",
      headers: nextHeaders,
      rows: nextRows,
    });
  };

  const removeTableColumn = (colIdx: number) => {
    if (featureTable.headers.length <= 1) {
      setTable(createEmptyFeatureTable());
      return;
    }
    setTable({
      ...featureTable,
      headers: featureTable.headers.filter((_, i) => i !== colIdx),
      rows: featureTable.rows.map((r) => r.filter((_, i) => i !== colIdx)),
    });
  };

  const addTableRow = () => {
    const headers =
      featureTable.headers.length > 0
        ? featureTable.headers
        : ["Series Code", "Aperture", "Glass Spec"];
    setTable({
      title: featureTable.title || "System Specification Matrix",
      headers,
      rows: [...featureTable.rows, headers.map(() => "")],
    });
  };

  const updateAccessories = (nextAcc: ProductAccessoryGroup[]) => {
    onChange({
      ...value,
      accessories: nextAcc,
    });
  };

  const addAccessoryGroup = () => {
    const idx = accessories.length + 1;
    const newGroup: ProductAccessoryGroup = {
      id: `acc-${Date.now()}`,
      name: `Hardware Accessory ${idx}`,
      subtitle: "Heavy-duty coastal-rated system hardware",
      brandName: ACCESSORY_BRAND_LOGO_PRESETS[(idx - 1) % ACCESSORY_BRAND_LOGO_PRESETS.length].brandName,
      brandLogo: ACCESSORY_BRAND_LOGO_PRESETS[(idx - 1) % ACCESSORY_BRAND_LOGO_PRESETS.length].url,
      image: PRODUCT_ASSET_PRESETS[1].url,
      variants: [
        {
          id: `var-${Date.now()}-1`,
          name: "Standard Architectural Finish",
          code: `INV-ACC-0${idx}`,
          finish: "Matte Charcoal",
          spec: "SS316 Coastal Rated",
          image: PRODUCT_ASSET_PRESETS[1].url,
        },
      ],
    };
    updateAccessories([...accessories, newGroup]);
  };

  const moveAccessory = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= accessories.length) return;
    const copy = [...accessories];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    updateAccessories(copy);
  };

  const addVariantToAccessory = (accIdx: number) => {
    const group = accessories[accIdx];
    const vCount = (group.variants || []).length + 1;
    const newVar: AccessoryVariantItem = {
      id: `var-${Date.now()}`,
      name: `${group.name} Variant ${vCount}`,
      code: `INV-${String(accIdx + 1).padStart(2, "0")}${String(vCount).padStart(2, "0")}`,
      finish: "Anodized Matte Finish",
      spec: "Tested to EN / Coastal Standards",
      image: group.image || PRODUCT_ASSET_PRESETS[1].url,
    };
    const nextAcc = accessories.map((a, idx) =>
      idx === accIdx ? { ...a, variants: [...(a.variants || []), newVar] } : a
    );
    updateAccessories(nextAcc);
  };

  const linkableDesignOptions = allDesigns
    .filter((d) => String(d.DesignID) !== String(value.DesignID))
    .map((d) => ({
      label: `${d.Design_Name} (${(d.Categories || [])[0] || "System"})`,
      value: String(d.DesignID),
    }));

  const currentLinkedValues = (value.relatedProductIds || []).map(String);

  return (
    <Tabs
      defaultActiveKey="general"
      type="card"
      size="small"
      items={[
        {
          key: "general",
          label: "1. Core & Media",
          children: (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <Input
                    value={value.Design_Name}
                    placeholder="e.g. Minimalist Slimline Sliding Door System"
                    onChange={(e) =>
                      onChange({ ...value, Design_Name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Unit Price (LKR)
                  </label>
                  <InputNumber
                    min={0}
                    step={5000}
                    value={value.price}
                    onChange={(val) =>
                      onChange({
                        ...value,
                        price: typeof val === "number" ? val : 0,
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Overview Description
                </label>
                <TextArea
                  rows={3}
                  value={value.Design_Description}
                  placeholder="Architectural overview displayed beside the product hero gallery..."
                  onChange={(e) =>
                    onChange({ ...value, Design_Description: e.target.value })
                  }
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Product Gallery Photos ({(value.Design_Image || []).length})
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      size="small"
                      placeholder="+ Quick Add Preset Photo"
                      value={undefined}
                      style={{ width: 190 }}
                      options={PRODUCT_ASSET_PRESETS.map((p) => ({
                        label: p.label,
                        value: p.url,
                      }))}
                      onChange={(url) => {
                        if (!url) return;
                        onChange({
                          ...value,
                          Design_Image: [...(value.Design_Image || []), url],
                        });
                      }}
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-[#3393B8] bg-[#EFF6FA] hover:border-[#22577A] text-xs font-semibold text-[#22577A] cursor-pointer">
                      <FiUpload />
                      <span>
                        {uploadingKey === "gallery-multi" ? "Uploading..." : "Upload Photo(s)"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => {
                          handleMultiGalleryUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                {(value.Design_Image || []).length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                    No gallery images yet. Click Upload Photo(s) or choose a preset photo above.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(value.Design_Image || []).map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col"
                      >
                        <div className="relative h-24 bg-slate-100">
                          <img
                            src={imgUrl}
                            alt={`Gallery ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextImgs = [...(value.Design_Image || [])];
                              nextImgs.splice(idx, 1);
                              onChange({ ...value, Design_Image: nextImgs });
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs cursor-pointer"
                            aria-label={`Remove photo ${idx + 1}`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                        <Input
                          size="small"
                          variant="borderless"
                          value={imgUrl}
                          onChange={(e) => {
                            const nextImgs = [...(value.Design_Image || [])];
                            nextImgs[idx] = e.target.value;
                            onChange({ ...value, Design_Image: nextImgs });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Finish Colors (Hex Codes)
                  </label>
                  <Select
                    mode="tags"
                    value={value.Design_Colors || []}
                    placeholder="e.g. #1F2937, #9CA3AF, #926B46"
                    options={[
                      { label: "Matte Charcoal (#1F2937)", value: "#1F2937" },
                      { label: "Anodized Silver (#9CA3AF)", value: "#9CA3AF" },
                      { label: "Champagne Bronze (#926B46)", value: "#926B46" },
                      { label: "Pure White (#F8FAFC)", value: "#F8FAFC" },
                      { label: "Slate Navy (#1E3A8A)", value: "#1E3A8A" },
                    ]}
                    style={{ width: "100%" }}
                    onChange={(vals) => onChange({ ...value, Design_Colors: vals })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Available Spans / Sizes
                  </label>
                  <Select
                    mode="tags"
                    value={value.Design_Sizes || []}
                    placeholder="e.g. 2400mm x 2100mm, Custom Engineered"
                    style={{ width: "100%" }}
                    onChange={(vals) => onChange({ ...value, Design_Sizes: vals })}
                  />
                </div>
              </div>
            </div>
          ),
        },
        {
          key: "linking",
          label: "2. Categories & Linked",
          children: (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Categories
                </label>
                <Select
                  mode="tags"
                  value={value.Categories || []}
                  options={categoryOptions}
                  placeholder="Select existing categories or add tags..."
                  style={{ width: "100%" }}
                  onChange={(vals) => onChange({ ...value, Categories: vals })}
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#22577A]">
                  <FiLink />
                  <span>Link Related Products (&ldquo;Related Products For You&rdquo;)</span>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  Choose which catalog products appear in the Related Products For You grid on this
                  product&apos;s detail page. Ordering follows selection sequence.
                </p>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={currentLinkedValues}
                  options={linkableDesignOptions}
                  placeholder="Search and link related products..."
                  style={{ width: "100%" }}
                  onChange={(vals: string[]) =>
                    onChange({
                      ...value,
                      relatedProductIds: vals.map((v) =>
                        /^\d+$/.test(v) && Number(v) < 1e12 ? Number(v) : v
                      ),
                    })
                  }
                />
              </div>
            </div>
          ),
        },
        {
          key: "features_table",
          label: "3. Features & Excel",
          children: (
            <div className="space-y-6 pt-2">
              {/* Features List */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#22577A]">
                    Product Features Bullets
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          features: [...(value.features || []), ""],
                        })
                      }
                    >
                      Add Feature
                    </Button>
                    {(value.features || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, features: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {(value.features || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic m-0">
                    No feature bullets configured. Click Add Feature to include them on the product page.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(value.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={feat}
                          placeholder="Feature specification bullet..."
                          onChange={(e) => {
                            const next = [...(value.features || [])];
                            next[idx] = e.target.value;
                            onChange({ ...value, features: next });
                          }}
                        />
                        <Button
                          danger
                          size="small"
                          icon={<FiTrash2 />}
                          onClick={() => {
                            const next = [...(value.features || [])];
                            next.splice(idx, 1);
                            onChange({ ...value, features: next });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature Comparison Table Designer & Excel Uploader */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#22577A]">
                      <FiGrid />
                      <span>Feature Comparison Table Designer &amp; Excel Import</span>
                    </div>
                    <p className="text-[11px] text-slate-500 m-0">
                      Build a custom product matrix manually or import directly from .xlsx / .xls / .csv.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-[#3393B8] bg-[#EFF6FA] hover:border-[#22577A] text-xs font-semibold text-[#22577A] cursor-pointer">
                      <FiUpload />
                      <span>Upload Excel / CSV</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          handleExcelUpload(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <Button
                      size="small"
                      icon={<FiDownload />}
                      onClick={() =>
                        exportFeatureTableTemplateExcel(
                          `${(value.Design_Name || "innovista").toLowerCase().replace(/\s+/g, "-")}-features-template.xlsx`
                        )
                      }
                    >
                      Sample .xlsx
                    </Button>

                    <Button
                      size="small"
                      onClick={() => setTable({ ...DEFAULT_DOOR_FEATURE_TABLE })}
                    >
                      Load Matrix Sample
                    </Button>

                    {featureTable.headers.length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => setTable(createEmptyFeatureTable())}
                      >
                        Clear Table
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      size="small"
                      value={featureTable.title}
                      placeholder="Optional Table Heading (e.g. Profile Series & Specification Matrix)"
                      onChange={(e) =>
                        setTable({ ...featureTable, title: e.target.value })
                      }
                      style={{ flex: 1 }}
                    />
                    <Button size="small" type="dashed" icon={<FiPlus />} onClick={addTableColumn}>
                      Add Column
                    </Button>
                    <Button size="small" type="dashed" icon={<FiPlus />} onClick={addTableRow}>
                      Add Row
                    </Button>
                  </div>

                  {featureTable.headers.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500">
                      No custom feature table configured yet. Click &ldquo;Add Column&rdquo;, &ldquo;Load Matrix Sample&rdquo;, or upload an Excel file.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#22577A] text-white">
                            {featureTable.headers.map((header, colIdx) => (
                              <th key={colIdx} className="p-2 border-r border-white/15 min-w-[140px]">
                                <div className="flex items-center gap-1">
                                  <Input
                                    size="small"
                                    value={header}
                                    placeholder={`Column ${colIdx + 1}`}
                                    onChange={(e) => {
                                      const nextHeaders = [...featureTable.headers];
                                      nextHeaders[colIdx] = e.target.value;
                                      setTable({ ...featureTable, headers: nextHeaders });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeTableColumn(colIdx)}
                                    className="p-1 text-white/80 hover:text-rose-200 bg-transparent border-0 cursor-pointer shrink-0"
                                    title="Remove column"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </th>
                            ))}
                            <th className="p-2 w-12 text-center">Del</th>
                          </tr>
                        </thead>
                        <tbody>
                          {featureTable.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-t border-slate-200">
                              {featureTable.headers.map((_, colIdx) => (
                                <td key={colIdx} className="p-1.5 border-r border-slate-100">
                                  <Input
                                    size="small"
                                    value={row[colIdx] ?? ""}
                                    placeholder="Cell value..."
                                    onChange={(e) => {
                                      const nextRows = featureTable.rows.map((r, i) => {
                                        if (i !== rowIdx) return r;
                                        const padded = Array.from(
                                          { length: featureTable.headers.length },
                                          (_, c) => r[c] ?? ""
                                        );
                                        padded[colIdx] = e.target.value;
                                        return padded;
                                      });
                                      setTable({ ...featureTable, rows: nextRows });
                                    }}
                                  />
                                </td>
                              ))}
                              <td className="p-1.5 text-center">
                                <Button
                                  danger
                                  size="small"
                                  icon={<FiTrash2 />}
                                  onClick={() =>
                                    setTable({
                                      ...featureTable,
                                      rows: featureTable.rows.filter((_, i) => i !== rowIdx),
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Spec Table Fields */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="text-xs font-bold text-[#22577A]">
                    Product Performance Specification Table
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      onClick={() =>
                        onChange({
                          ...value,
                          performance: { ...DEFAULT_PERFORMANCE_SPEC },
                        })
                      }
                    >
                      Fill Standard Template
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() =>
                        onChange({
                          ...value,
                          performance: createEmptyPerformanceSpec(),
                        })
                      }
                    >
                      Clear Performance
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Airtightness
                    </label>
                    <Input
                      size="small"
                      value={perf.airtightness}
                      onChange={(e) => updatePerformance("airtightness", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Water-tightness
                    </label>
                    <Input
                      size="small"
                      value={perf.watertightness}
                      onChange={(e) => updatePerformance("watertightness", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Sound Insulation
                    </label>
                    <Input
                      size="small"
                      value={perf.soundInsulation}
                      onChange={(e) => updatePerformance("soundInsulation", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Thermal Insulation
                    </label>
                    <Input
                      size="small"
                      value={perf.thermalInsulation}
                      onChange={(e) => updatePerformance("thermalInsulation", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Wind Resistance
                    </label>
                    <Input
                      size="small"
                      value={perf.windResistance}
                      onChange={(e) => updatePerformance("windResistance", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      System Type
                    </label>
                    <Input
                      size="small"
                      value={perf.productType}
                      onChange={(e) => updatePerformance("productType", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Visible Surface
                    </label>
                    <Input
                      size="small"
                      value={perf.visibleSurface}
                      onChange={(e) => updatePerformance("visibleSurface", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Wall Thickness
                    </label>
                    <Input
                      size="small"
                      value={perf.wallThickness}
                      onChange={(e) => updatePerformance("wallThickness", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Frame Thickness
                    </label>
                    <Input
                      size="small"
                      value={perf.frameThickness}
                      onChange={(e) => updatePerformance("frameThickness", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Size Range (mm)
                    </label>
                    <Input
                      size="small"
                      value={perf.sizeRange}
                      onChange={(e) => updatePerformance("sizeRange", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Glass Thickness
                    </label>
                    <Input
                      size="small"
                      value={perf.glassThickness}
                      onChange={(e) => updatePerformance("glassThickness", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Maximum Load-Bearing
                    </label>
                    <Input
                      size="small"
                      value={perf.maxLoadBearing}
                      onChange={(e) => updatePerformance("maxLoadBearing", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: "accessories",
          label: `4. Accessories (${accessories.length})`,
          children: (
            <div className="space-y-5 pt-2">
              {/* Heading, Tagline & Speed Settings */}
              <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Accessories Section Heading
                    </label>
                    <Input
                      value={value.accessoriesHeading || ""}
                      placeholder="e.g. Door Hardware & Accessory Variants"
                      onChange={(e) =>
                        onChange({ ...value, accessoriesHeading: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Accessories Section Tagline
                    </label>
                    <Input
                      value={value.accessoriesTagline || ""}
                      placeholder="Short caption above slideshow & auto-sliding ribbon"
                      onChange={(e) =>
                        onChange({ ...value, accessoriesTagline: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Accessories Slideshow Interval (seconds)</span>
                      <span className="text-[#22577A] font-bold tabular-nums">
                        {slideshowSeconds}s
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={1.5}
                        max={20}
                        step={0.5}
                        value={slideshowSeconds}
                        style={{ flex: 1 }}
                        onChange={(sec) =>
                          onChange({
                            ...value,
                            accessoriesSlideshowSpeedMs: clampSlideshowSpeedMs(sec * 1000),
                          })
                        }
                      />
                      <InputNumber
                        size="small"
                        min={1.5}
                        max={20}
                        step={0.5}
                        value={slideshowSeconds}
                        style={{ width: 68 }}
                        onChange={(sec) => {
                          if (typeof sec === "number") {
                            onChange({
                              ...value,
                              accessoriesSlideshowSpeedMs: clampSlideshowSpeedMs(sec * 1000),
                            });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Auto-Sliding Variants Ribbon Speed (px/s)</span>
                      <span className="text-[#22577A] font-bold tabular-nums">
                        {ribbonSpeed} px/s
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={15}
                        max={120}
                        step={5}
                        value={ribbonSpeed}
                        style={{ flex: 1 }}
                        onChange={(spd) =>
                          onChange({
                            ...value,
                            accessoriesRibbonSpeed: clampRibbonSpeed(spd),
                          })
                        }
                      />
                      <InputNumber
                        size="small"
                        min={15}
                        max={120}
                        step={5}
                        value={ribbonSpeed}
                        style={{ width: 68 }}
                        onChange={(spd) => {
                          if (typeof spd === "number") {
                            onChange({
                              ...value,
                              accessoriesRibbonSpeed: clampRibbonSpeed(spd),
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accessories Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#22577A]">
                  Accessory Groups &amp; Nested Variants ({accessories.length} groups)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    type="primary"
                    icon={<FiPlus />}
                    style={{ background: "#22577A", borderColor: "#22577A" }}
                    onClick={addAccessoryGroup}
                  >
                    Add Accessory
                  </Button>
                  <Button
                    size="small"
                    onClick={() => updateAccessories(DEFAULT_DOOR_ACCESSORIES)}
                  >
                    Load Door Presets
                  </Button>
                  <Button
                    size="small"
                    onClick={() => updateAccessories(DEFAULT_WINDOW_ACCESSORIES)}
                  >
                    Load Window Presets
                  </Button>
                  {accessories.length > 0 && (
                    <Button size="small" danger onClick={() => updateAccessories([])}>
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {accessories.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                  No accessories configured for this product — the Accessories Slideshow &amp; Variants
                  Ribbon section stays hidden on the public page. Add an accessory group or load Door / Window presets above.
                </div>
              ) : (
                <div className="space-y-4">
                  {accessories.map((group, accIdx) => (
                    <div
                      key={group.id || accIdx}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      {/* Group Header */}
                      <div className="bg-slate-50/80 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#22577A]">
                          Accessory Group #{accIdx + 1}: {group.name || "Untitled"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="small"
                            disabled={accIdx === 0}
                            icon={<FiArrowUp />}
                            onClick={() => moveAccessory(accIdx, -1)}
                          />
                          <Button
                            size="small"
                            disabled={accIdx === accessories.length - 1}
                            icon={<FiArrowDown />}
                            onClick={() => moveAccessory(accIdx, 1)}
                          />
                          <Button
                            size="small"
                            danger
                            icon={<FiTrash2 />}
                            onClick={() =>
                              updateAccessories(accessories.filter((_, i) => i !== accIdx))
                            }
                          >
                            Delete Group
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                          <div className="sm:col-span-3">
                            <div className="aspect-[4/3] rounded-lg border border-slate-200 bg-slate-100 overflow-hidden mb-1.5">
                              {group.image && (
                                <img
                                  src={group.image}
                                  alt={group.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <label className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[#3393B8] bg-[#EFF6FA] text-[11px] font-semibold text-[#22577A] cursor-pointer">
                              <FiUpload />
                              <span>
                                {uploadingKey === `acc-${accIdx}` ? "Uploading..." : "Upload Image"}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  handleSingleImageUpload(
                                    e.target.files?.[0],
                                    `acc-${accIdx}`,
                                    (url) =>
                                      updateAccessories(
                                        accessories.map((a, i) =>
                                          i === accIdx ? { ...a, image: url } : a
                                        )
                                      )
                                  );
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>

                          <div className="sm:col-span-9 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Accessory Name
                                </label>
                                <Input
                                  size="small"
                                  value={group.name}
                                  onChange={(e) =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx ? { ...a, name: e.target.value } : a
                                      )
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Group Image URL
                                </label>
                                <Input
                                  size="small"
                                  value={group.image}
                                  onChange={(e) =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx ? { ...a, image: e.target.value } : a
                                      )
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Accessory Summary / Engineering Subtitle
                              </label>
                              <Input
                                size="small"
                                value={group.subtitle}
                                onChange={(e) =>
                                  updateAccessories(
                                    accessories.map((a, i) =>
                                      i === accIdx ? { ...a, subtitle: e.target.value } : a
                                    )
                                  )
                                }
                              />
                            </div>

                            {/* Hardware Brand Name & Brand Logo Controls */}
                            <div className="p-2.5 rounded-lg border border-slate-200 bg-[#F8FAFC] space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-[#22577A]">
                                  Accessory Hardware Brand &amp; Logo (Card Shuffle Deck)
                                </span>
                                {group.brandLogo && (
                                  <div className="inline-flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                                    <img
                                      src={group.brandLogo}
                                      alt={group.brandName || "Brand logo"}
                                      className="h-4 w-auto max-w-[90px] object-contain"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateAccessories(
                                          accessories.map((a, i) =>
                                            i === accIdx ? { ...a, brandLogo: "" } : a
                                          )
                                        )
                                      }
                                      className="text-[10px] font-semibold text-red-600 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                <div className="sm:col-span-4">
                                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                                    Brand Name
                                  </label>
                                  <Input
                                    size="small"
                                    placeholder="e.g. NordicLock"
                                    value={group.brandName || ""}
                                    onChange={(e) =>
                                      updateAccessories(
                                        accessories.map((a, i) =>
                                          i === accIdx ? { ...a, brandName: e.target.value } : a
                                        )
                                      )
                                    }
                                  />
                                </div>

                                <div className="sm:col-span-5">
                                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                                    Brand Logo URL or Preset
                                  </label>
                                  <div className="flex gap-1.5">
                                    <Input
                                      size="small"
                                      placeholder="/assets/logos/..."
                                      value={group.brandLogo || ""}
                                      onChange={(e) =>
                                        updateAccessories(
                                          accessories.map((a, i) =>
                                            i === accIdx ? { ...a, brandLogo: e.target.value } : a
                                          )
                                        )
                                      }
                                    />
                                    <Select
                                      size="small"
                                      placeholder="Preset"
                                      value={undefined}
                                      style={{ width: 105, flexShrink: 0 }}
                                      options={ACCESSORY_BRAND_LOGO_PRESETS.map((p) => ({
                                        label: p.brandName,
                                        value: p.url,
                                      }))}
                                      onSelect={(selectedUrl: string | undefined) => {
                                        if (!selectedUrl) return;
                                        const preset = ACCESSORY_BRAND_LOGO_PRESETS.find(
                                          (p) => p.url === selectedUrl
                                        );
                                        updateAccessories(
                                          accessories.map((a, i) =>
                                            i === accIdx
                                              ? {
                                                  ...a,
                                                  brandLogo: selectedUrl,
                                                  brandName: a.brandName?.trim()
                                                    ? a.brandName
                                                    : preset?.brandName || "",
                                                }
                                              : a
                                          )
                                        );
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-[#3393B8] bg-white text-[11px] font-semibold text-[#22577A] cursor-pointer">
                                    <FiUpload />
                                    <span>
                                      {uploadingKey === `brand-${accIdx}`
                                        ? "Uploading..."
                                        : "Upload Logo"}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        handleSingleImageUpload(
                                          e.target.files?.[0],
                                          `brand-${accIdx}`,
                                          (url) =>
                                            updateAccessories(
                                              accessories.map((a, i) =>
                                                i === accIdx ? { ...a, brandLogo: url } : a
                                              )
                                            )
                                        );
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nested Variants */}
                        <div className="border-t border-slate-100 pt-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Accessory Variants ({(group.variants || []).length})
                            </span>
                            <Button
                              size="small"
                              type="dashed"
                              icon={<FiPlus />}
                              onClick={() => addVariantToAccessory(accIdx)}
                            >
                              Add Variant
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {(group.variants || []).map((variant, vIdx) => (
                              <div
                                key={variant.id || vIdx}
                                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                              >
                                <div className="sm:col-span-2 flex items-center gap-2">
                                  <div className="w-11 h-11 rounded-md border border-slate-200 bg-white overflow-hidden shrink-0">
                                    {variant.image && (
                                      <img
                                        src={variant.image}
                                        alt={variant.name}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-[#3393B8] bg-white text-[10px] font-semibold text-[#22577A] cursor-pointer whitespace-nowrap">
                                    <FiUpload />
                                    <span>
                                      {uploadingKey === `var-${accIdx}-${vIdx}`
                                        ? "..."
                                        : "Upload"}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        handleSingleImageUpload(
                                          e.target.files?.[0],
                                          `var-${accIdx}-${vIdx}`,
                                          (url) =>
                                            updateAccessories(
                                              accessories.map((a, i) =>
                                                i === accIdx
                                                  ? {
                                                      ...a,
                                                      variants: a.variants.map((v, j) =>
                                                        j === vIdx ? { ...v, image: url } : v
                                                      ),
                                                    }
                                                  : a
                                              )
                                            )
                                        );
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                </div>

                                <Input
                                  className="sm:col-span-3"
                                  size="small"
                                  placeholder="Variant Name"
                                  value={variant.name}
                                  onChange={(e) =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx
                                          ? {
                                              ...a,
                                              variants: a.variants.map((v, j) =>
                                                j === vIdx ? { ...v, name: e.target.value } : v
                                              ),
                                            }
                                          : a
                                      )
                                    )
                                  }
                                />

                                <Input
                                  className="sm:col-span-2"
                                  size="small"
                                  placeholder="Code (e.g. INV-01)"
                                  value={variant.code}
                                  onChange={(e) =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx
                                          ? {
                                              ...a,
                                              variants: a.variants.map((v, j) =>
                                                j === vIdx ? { ...v, code: e.target.value } : v
                                              ),
                                            }
                                          : a
                                      )
                                    )
                                  }
                                />

                                <Input
                                  className="sm:col-span-2"
                                  size="small"
                                  placeholder="Finish"
                                  value={variant.finish}
                                  onChange={(e) =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx
                                          ? {
                                              ...a,
                                              variants: a.variants.map((v, j) =>
                                                j === vIdx ? { ...v, finish: e.target.value } : v
                                              ),
                                            }
                                          : a
                                      )
                                    )
                                  }
                                />

                                <Input
                                  className="sm:col-span-2"
                                  size="small"
                                  placeholder="Technical Spec"
                                  value={variant.spec}
                                  onChange={(e) =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx
                                          ? {
                                              ...a,
                                              variants: a.variants.map((v, j) =>
                                                j === vIdx ? { ...v, spec: e.target.value } : v
                                              ),
                                            }
                                          : a
                                      )
                                    )
                                  }
                                />

                                <Button
                                  className="sm:col-span-1"
                                  danger
                                  size="small"
                                  icon={<FiTrash2 />}
                                  onClick={() =>
                                    updateAccessories(
                                      accessories.map((a, i) =>
                                        i === accIdx
                                          ? {
                                              ...a,
                                              variants: a.variants.filter((_, j) => j !== vIdx),
                                            }
                                          : a
                                      )
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        },
        {
          key: "configs",
          label: "5. Configs & Certs",
          children: (
            <div className="space-y-6 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Panel Configurations (e.g. 3-3-0, 4-1-3, 5-5-0, 7-0-7)
                  </label>
                  {(value.configurations || []).length > 0 && (
                    <Button
                      size="small"
                      danger
                      onClick={() => onChange({ ...value, configurations: [] })}
                    >
                      Clear Configs
                    </Button>
                  )}
                </div>
                <Select
                  mode="tags"
                  value={value.configurations || []}
                  options={CONFIG_SUGGESTIONS.map((c) => ({ label: c, value: c }))}
                  style={{ width: "100%" }}
                  onChange={(vals) => onChange({ ...value, configurations: vals })}
                />
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Downloadable Model Specs &amp; CAD Files
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          downloads: [
                            ...(value.downloads || []),
                            {
                              id: `dl-${Date.now()}`,
                              title: `${value.Design_Name || "System"} Spec Sheet`,
                              fileType: "PDF",
                              url: "#spec-pdf",
                            },
                          ],
                        })
                      }
                    >
                      Add File
                    </Button>
                    {(value.downloads || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, downloads: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {(value.downloads || []).map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <Input
                      className="sm:col-span-5"
                      size="small"
                      placeholder="Document Title"
                      value={doc.title}
                      onChange={(e) => {
                        const next = [...(value.downloads || [])];
                        next[idx] = { ...doc, title: e.target.value };
                        onChange({ ...value, downloads: next });
                      }}
                    />
                    <Select
                      className="sm:col-span-2"
                      size="small"
                      value={doc.fileType}
                      options={[
                        { label: "PDF", value: "PDF" },
                        { label: "CAD", value: "CAD" },
                      ]}
                      onChange={(ft) => {
                        const next = [...(value.downloads || [])];
                        next[idx] = { ...doc, fileType: ft };
                        onChange({ ...value, downloads: next });
                      }}
                    />
                    <Input
                      className="sm:col-span-4"
                      size="small"
                      placeholder="URL or #spec-pdf"
                      value={doc.url}
                      onChange={(e) => {
                        const next = [...(value.downloads || [])];
                        next[idx] = { ...doc, url: e.target.value };
                        onChange({ ...value, downloads: next });
                      }}
                    />
                    <Button
                      className="sm:col-span-1"
                      danger
                      size="small"
                      icon={<FiTrash2 />}
                      onClick={() => {
                        const next = [...(value.downloads || [])];
                        next.splice(idx, 1);
                        onChange({ ...value, downloads: next });
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Certification Images Uploader (Up to 8 images) */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-[#22577A]" />
                    <label className="text-xs font-bold text-[#22577A]">
                      Certification &amp; Lab Test Images (Up to {MAX_CERTIFICATION_IMAGES} images)
                    </label>
                    <span className="px-2 py-0.5 rounded bg-[#EFF6FA] border border-[#3393B8]/30 text-[11px] font-bold text-[#22577A] tabular-nums">
                      {certImages.length} / {MAX_CERTIFICATION_IMAGES} uploaded
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed text-xs font-semibold ${
                        certImages.length >= MAX_CERTIFICATION_IMAGES
                          ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "border-[#3393B8] bg-[#EFF6FA] hover:border-[#22577A] text-[#22577A] cursor-pointer"
                      }`}
                    >
                      <FiUpload />
                      <span>
                        {uploadingKey === "cert-multi"
                          ? "Uploading..."
                          : "Upload Certificate(s)"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={certImages.length >= MAX_CERTIFICATION_IMAGES}
                        style={{ display: "none" }}
                        onChange={(e) => {
                          handleMultiCertImageUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <Button
                      size="small"
                      onClick={() =>
                        onChange({
                          ...value,
                          certificationImages: DEFAULT_CERTIFICATION_IMAGES,
                        })
                      }
                    >
                      Load Sample 4
                    </Button>

                    {certImages.length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, certificationImages: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {certImages.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                    No certification images uploaded yet. Upload up to {MAX_CERTIFICATION_IMAGES}{" "}
                    certificate or laboratory test report images.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {certImages.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col"
                      >
                        <div className="relative h-28 bg-slate-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...value,
                                certificationImages: certImages.filter((_, i) => i !== idx),
                              })
                            }
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs cursor-pointer"
                            aria-label={`Remove certificate ${idx + 1}`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                        <div className="p-1.5 bg-white">
                          <Input
                            size="small"
                            placeholder="Certificate title"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...certImages];
                              next[idx] = { ...item, title: e.target.value };
                              onChange({ ...value, certificationImages: next });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Energy Performance Rating Cards */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Energy Performance Rating Cards
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          certifications: [
                            ...(value.certifications || []),
                            {
                              id: `cert-${Date.now()}`,
                              standardLabel: "Energy Performance Rating",
                              uFactor: "2.10 / 0.37",
                              shgc: "0.28",
                              energyRating: "10",
                              visibleTransmittance: "0.45",
                              specSummary: "Double Glazed Low-E Argon Filled",
                              badgeCode: "EN 14351-1",
                            },
                          ],
                        })
                      }
                    >
                      Add Rating Card
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        onChange({
                          ...value,
                          certifications: DEFAULT_PRODUCT_CERTIFICATIONS,
                        })
                      }
                    >
                      Load Defaults
                    </Button>
                    {(value.certifications || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, certifications: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {(value.certifications || []).map((cert, idx) => (
                  <div
                    key={cert.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center"
                  >
                    <Input
                      size="small"
                      placeholder="Badge Code"
                      value={cert.badgeCode}
                      onChange={(e) => {
                        const next = [...(value.certifications || [])];
                        next[idx] = { ...cert, badgeCode: e.target.value };
                        onChange({ ...value, certifications: next });
                      }}
                    />
                    <Input
                      size="small"
                      placeholder="U-Factor"
                      value={cert.uFactor}
                      onChange={(e) => {
                        const next = [...(value.certifications || [])];
                        next[idx] = { ...cert, uFactor: e.target.value };
                        onChange({ ...value, certifications: next });
                      }}
                    />
                    <Input
                      size="small"
                      placeholder="SHGC"
                      value={cert.shgc}
                      onChange={(e) => {
                        const next = [...(value.certifications || [])];
                        next[idx] = { ...cert, shgc: e.target.value };
                        onChange({ ...value, certifications: next });
                      }}
                    />
                    <Input
                      size="small"
                      placeholder="Rating"
                      value={cert.energyRating}
                      onChange={(e) => {
                        const next = [...(value.certifications || [])];
                        next[idx] = { ...cert, energyRating: e.target.value };
                        onChange({ ...value, certifications: next });
                      }}
                    />
                    <Input
                      size="small"
                      placeholder="VT"
                      value={cert.visibleTransmittance}
                      onChange={(e) => {
                        const next = [...(value.certifications || [])];
                        next[idx] = { ...cert, visibleTransmittance: e.target.value };
                        onChange({ ...value, certifications: next });
                      }}
                    />
                    <Button
                      danger
                      size="small"
                      icon={<FiTrash2 />}
                      onClick={() => {
                        const next = [...(value.certifications || [])];
                        next.splice(idx, 1);
                        onChange({ ...value, certifications: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          key: "faqs",
          label: "6. FAQs & Installations",
          children: (
            <div className="space-y-6 pt-2">
              <div className="p-3 rounded-lg bg-[#EFF6FA] border border-[#3393B8]/25 text-xs text-[#22577A]">
                Any section left empty below will automatically stay hidden on this product&apos;s public page.
              </div>

              {/* FAQs Editor */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800">Product FAQs</label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          faqs: [
                            ...(value.faqs || []),
                            { id: `faq-${Date.now()}`, question: "", answer: "" },
                          ],
                        })
                      }
                    >
                      Add FAQ
                    </Button>
                    <Button
                      size="small"
                      onClick={() => onChange({ ...value, faqs: DEFAULT_PRODUCT_FAQS })}
                    >
                      Load Defaults
                    </Button>
                    {(value.faqs || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, faqs: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {(value.faqs || []).map((faq, idx) => (
                  <div
                    key={faq.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        size="small"
                        placeholder="Question"
                        value={faq.question}
                        onChange={(e) => {
                          const next = [...(value.faqs || [])];
                          next[idx] = { ...faq, question: e.target.value };
                          onChange({ ...value, faqs: next });
                        }}
                      />
                      <Button
                        danger
                        size="small"
                        icon={<FiTrash2 />}
                        onClick={() => {
                          const next = [...(value.faqs || [])];
                          next.splice(idx, 1);
                          onChange({ ...value, faqs: next });
                        }}
                      />
                    </div>
                    <TextArea
                      rows={2}
                      size="small"
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={(e) => {
                        const next = [...(value.faqs || [])];
                        next[idx] = { ...faq, answer: e.target.value };
                        onChange({ ...value, faqs: next });
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Technical Advantages with Image Upload */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    Performance &amp; Technical Advantages
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          advantages: [
                            ...(value.advantages || []),
                            {
                              id: `adv-${Date.now()}`,
                              title: "",
                              description: "",
                              image: PRODUCT_ASSET_PRESETS[9].url,
                            },
                          ],
                        })
                      }
                    >
                      Add Advantage
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        onChange({ ...value, advantages: DEFAULT_PRODUCT_ADVANTAGES })
                      }
                    >
                      Load Defaults
                    </Button>
                    {(value.advantages || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, advantages: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {(value.advantages || []).map((adv, idx) => (
                  <div
                    key={adv.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
                        {adv.image && (
                          <img
                            src={adv.image}
                            alt={adv.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-dashed border-[#3393B8] bg-white text-[11px] font-semibold text-[#22577A] cursor-pointer whitespace-nowrap">
                        <FiUpload />
                        <span>{uploadingKey === `adv-${idx}` ? "..." : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            handleSingleImageUpload(
                              e.target.files?.[0],
                              `adv-${idx}`,
                              (url) => {
                                const next = [...(value.advantages || [])];
                                next[idx] = { ...adv, image: url };
                                onChange({ ...value, advantages: next });
                              }
                            );
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <Input
                      className="sm:col-span-3"
                      size="small"
                      placeholder="Advantage Title"
                      value={adv.title}
                      onChange={(e) => {
                        const next = [...(value.advantages || [])];
                        next[idx] = { ...adv, title: e.target.value };
                        onChange({ ...value, advantages: next });
                      }}
                    />
                    <Input
                      className="sm:col-span-5"
                      size="small"
                      placeholder="Engineering description"
                      value={adv.description}
                      onChange={(e) => {
                        const next = [...(value.advantages || [])];
                        next[idx] = { ...adv, description: e.target.value };
                        onChange({ ...value, advantages: next });
                      }}
                    />
                    <Button
                      className="sm:col-span-1"
                      danger
                      size="small"
                      icon={<FiTrash2 />}
                      onClick={() => {
                        const next = [...(value.advantages || [])];
                        next.splice(idx, 1);
                        onChange({ ...value, advantages: next });
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Customization Options Editor */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    Customization Options Cards
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          customizations: [
                            ...(value.customizations || []),
                            {
                              id: `cust-${Date.now()}`,
                              category: "color",
                              title: "",
                              description: "",
                            },
                          ],
                        })
                      }
                    >
                      Add Option
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        onChange({
                          ...value,
                          customizations: DEFAULT_PRODUCT_CUSTOMIZATIONS,
                        })
                      }
                    >
                      Load Defaults
                    </Button>
                    {(value.customizations || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, customizations: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(value.customizations || []).map((cust, idx) => (
                    <div
                      key={cust.id || idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                    >
                      <div className="flex gap-2">
                        <Select
                          size="small"
                          value={cust.category}
                          options={CUSTOMIZATION_CATEGORIES}
                          style={{ width: 105 }}
                          onChange={(cat) => {
                            const next = [...(value.customizations || [])];
                            next[idx] = { ...cust, category: cat };
                            onChange({ ...value, customizations: next });
                          }}
                        />
                        <Input
                          size="small"
                          placeholder="Title"
                          value={cust.title}
                          onChange={(e) => {
                            const next = [...(value.customizations || [])];
                            next[idx] = { ...cust, title: e.target.value };
                            onChange({ ...value, customizations: next });
                          }}
                        />
                        <Button
                          danger
                          size="small"
                          icon={<FiTrash2 />}
                          onClick={() => {
                            const next = [...(value.customizations || [])];
                            next.splice(idx, 1);
                            onChange({ ...value, customizations: next });
                          }}
                        />
                      </div>
                      <Input
                        size="small"
                        placeholder="Short description"
                        value={cust.description}
                        onChange={(e) => {
                          const next = [...(value.customizations || [])];
                          next[idx] = { ...cust, description: e.target.value };
                          onChange({ ...value, customizations: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Partner Services + Background Banner Image */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    Partner Support Services &amp; Banner Image
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          partnerServices: [
                            ...(value.partnerServices || []),
                            {
                              id: `srv-${Date.now()}`,
                              step: String((value.partnerServices || []).length + 1).padStart(
                                2,
                                "0"
                              ),
                              title: "",
                              description: "",
                            },
                          ],
                        })
                      }
                    >
                      Add Service Step
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        onChange({
                          ...value,
                          partnerServices: DEFAULT_PARTNER_SERVICES,
                        })
                      }
                    >
                      Load Defaults
                    </Button>
                    {(value.partnerServices || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, partnerServices: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {/* Partner Banner Image Uploader */}
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3">
                  <div className="w-16 h-11 rounded border border-slate-200 bg-white overflow-hidden shrink-0">
                    {value.partnerServiceBannerImage && (
                      <img
                        src={value.partnerServiceBannerImage}
                        alt="Partner services banner"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <Input
                    size="small"
                    placeholder="Service Banner Background URL"
                    value={value.partnerServiceBannerImage || ""}
                    style={{ flex: 1, minWidth: 180 }}
                    onChange={(e) =>
                      onChange({ ...value, partnerServiceBannerImage: e.target.value })
                    }
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-[#3393B8] bg-white text-xs font-semibold text-[#22577A] cursor-pointer">
                    <FiUpload />
                    <span>
                      {uploadingKey === "partner-banner" ? "Uploading..." : "Upload Banner"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        handleSingleImageUpload(
                          e.target.files?.[0],
                          "partner-banner",
                          (url) =>
                            onChange({ ...value, partnerServiceBannerImage: url })
                        );
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {(value.partnerServices || []).map((srv, idx) => (
                  <div
                    key={srv.id || idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <Input
                      className="sm:col-span-2"
                      size="small"
                      placeholder="01"
                      value={srv.step}
                      onChange={(e) => {
                        const next = [...(value.partnerServices || [])];
                        next[idx] = { ...srv, step: e.target.value };
                        onChange({ ...value, partnerServices: next });
                      }}
                    />
                    <Input
                      className="sm:col-span-4"
                      size="small"
                      placeholder="Service Title"
                      value={srv.title}
                      onChange={(e) => {
                        const next = [...(value.partnerServices || [])];
                        next[idx] = { ...srv, title: e.target.value };
                        onChange({ ...value, partnerServices: next });
                      }}
                    />
                    <Input
                      className="sm:col-span-5"
                      size="small"
                      placeholder="Description"
                      value={srv.description}
                      onChange={(e) => {
                        const next = [...(value.partnerServices || [])];
                        next[idx] = { ...srv, description: e.target.value };
                        onChange({ ...value, partnerServices: next });
                      }}
                    />
                    <Button
                      className="sm:col-span-1"
                      danger
                      size="small"
                      icon={<FiTrash2 />}
                      onClick={() => {
                        const next = [...(value.partnerServices || [])];
                        next.splice(idx, 1);
                        onChange({ ...value, partnerServices: next });
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Client Installations Showcase Editor with Image Upload */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      Client Installations Showcase
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      Leave empty or click Clear All if this product has no client installation showcase yet — it will remain hidden on the product page.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type="dashed"
                      icon={<FiPlus />}
                      onClick={() =>
                        onChange({
                          ...value,
                          clientShowcases: [
                            ...(value.clientShowcases || []),
                            {
                              id: `sc-${Date.now()}`,
                              location: "Colombo Project",
                              title: "Custom Installation",
                              image: "/assets/products/hero-showroom.jpg",
                            },
                          ],
                        })
                      }
                    >
                      Add Installation
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        onChange({
                          ...value,
                          clientShowcases: DEFAULT_CLIENT_SHOWCASES,
                        })
                      }
                    >
                      Load Defaults
                    </Button>
                    {(value.clientShowcases || []).length > 0 && (
                      <Button
                        size="small"
                        danger
                        onClick={() => onChange({ ...value, clientShowcases: [] })}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {(value.clientShowcases || []).length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                    Client Installations hidden for this product (0 installations set).
                  </div>
                ) : (
                  (value.clientShowcases || []).map((sc, idx) => (
                    <div
                      key={sc.id || idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-3 flex items-center gap-2">
                        <div className="w-11 h-11 rounded border border-slate-200 bg-white overflow-hidden shrink-0">
                          {sc.image && (
                            <img
                              src={sc.image}
                              alt={sc.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-dashed border-[#3393B8] bg-white text-[11px] font-semibold text-[#22577A] cursor-pointer whitespace-nowrap">
                          <FiUpload />
                          <span>{uploadingKey === `sc-${idx}` ? "..." : "Upload"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              handleSingleImageUpload(
                                e.target.files?.[0],
                                `sc-${idx}`,
                                (url) => {
                                  const next = [...(value.clientShowcases || [])];
                                  next[idx] = { ...sc, image: url };
                                  onChange({ ...value, clientShowcases: next });
                                }
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <Input
                        className="sm:col-span-3"
                        size="small"
                        placeholder="Location Tab"
                        value={sc.location}
                        onChange={(e) => {
                          const next = [...(value.clientShowcases || [])];
                          next[idx] = { ...sc, location: e.target.value };
                          onChange({ ...value, clientShowcases: next });
                        }}
                      />
                      <Input
                        className="sm:col-span-3"
                        size="small"
                        placeholder="Project Title"
                        value={sc.title}
                        onChange={(e) => {
                          const next = [...(value.clientShowcases || [])];
                          next[idx] = { ...sc, title: e.target.value };
                          onChange({ ...value, clientShowcases: next });
                        }}
                      />
                      <Input
                        className="sm:col-span-2"
                        size="small"
                        placeholder="Image URL"
                        value={sc.image}
                        onChange={(e) => {
                          const next = [...(value.clientShowcases || [])];
                          next[idx] = { ...sc, image: e.target.value };
                          onChange({ ...value, clientShowcases: next });
                        }}
                      />
                      <Button
                        className="sm:col-span-1"
                        danger
                        size="small"
                        icon={<FiTrash2 />}
                        onClick={() => {
                          const next = [...(value.clientShowcases || [])];
                          next.splice(idx, 1);
                          onChange({ ...value, clientShowcases: next });
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
