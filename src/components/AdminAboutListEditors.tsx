import { Button, Input, InputNumber, Select, Slider } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  ABOUT_CLIENT_LOGO_PRESETS,
  ABOUT_PARTNER_LOGO_PRESETS,
  ABOUT_PRESET_IMAGES,
  DEFAULT_LOGO_SCALE,
  LOGO_SCALE_OPTIONS,
  MAX_LOGO_SCALE,
  MAX_RIBBON_SPEED,
  MIN_LOGO_SCALE,
  MIN_RIBBON_SPEED,
  RIBBON_SPEED_PRESETS,
  clampLogoScale,
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  moveArrayItem,
  type ClientFeedbackItem,
  type ClientItem,
  type JourneyMilestoneItem,
  type PartnerItem,
  type TeamMemberItem,
} from "../utils/aboutContentHelpers";

const { TextArea } = Input;

function ItemHeader({
  label,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  label: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pb-1">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button
          size="small"
          icon={<ArrowUpOutlined />}
          disabled={index === 0}
          aria-label={`Move ${label} Up`}
          onClick={onMoveUp}
        />
        <Button
          size="small"
          icon={<ArrowDownOutlined />}
          disabled={index === total - 1}
          aria-label={`Move ${label} Down`}
          onClick={onMoveDown}
        />
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={total <= 1}
          title={total <= 1 ? "At least 1 item must remain" : `Delete ${label}`}
          aria-label={`Delete ${label}`}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function ImageUploadAndPresets({
  uploadKey,
  uploadingField,
  onUpload,
  onSelectPreset,
  presets = ABOUT_PRESET_IMAGES.slice(0, 5),
}: {
  uploadKey: string;
  uploadingField: string | null;
  onUpload: (file: File) => void;
  onSelectPreset: (url: string) => void;
  presets?: { label: string; url: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-400">
        <UploadOutlined />
        <span>{uploadingField === uploadKey ? "Uploading..." : "Upload Image"}</span>
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.[0]) onUpload(e.target.files[0]);
          }}
        />
      </label>
      {presets.map((preset) => (
        <button
          key={preset.url}
          type="button"
          onClick={() => onSelectPreset(preset.url)}
          className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] font-medium text-slate-700 cursor-pointer whitespace-nowrap"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export function TeamEditorTab({
  items,
  onChange,
  uploadingField,
  onUploadFile,
}: {
  items: TeamMemberItem[];
  onChange: (next: TeamMemberItem[]) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, key: string, onUrl: (url: string) => void) => void;
}) {
  const handleAdd = () => {
    const nextNum = items.length + 1;
    onChange([
      ...items,
      {
        id: `team-${Date.now()}`,
        name: `Team Member ${nextNum}`,
        role: "Senior Facade Specialist",
        specialty: "Custom architectural aluminium detailing and structural site QA.",
        image: ABOUT_PRESET_IMAGES[6].url,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">
          Add, edit, reorder, or remove leadership and fabrication team members.
        </span>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Team Member
        </Button>
      </div>

      {items.map((member, idx) => (
        <div
          key={member.id}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
        >
          <ItemHeader
            label={`Member ${idx + 1}: ${member.name || "Untitled"}`}
            index={idx}
            total={items.length}
            onMoveUp={() => onChange(moveArrayItem(items, idx, -1))}
            onMoveDown={() => onChange(moveArrayItem(items, idx, 1))}
            onDelete={() =>
              items.length > 1 && onChange(items.filter((x) => x.id !== member.id))
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <Input
                value={member.name}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === member.id ? { ...x, name: e.target.value } : x))
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Title</label>
              <Input
                value={member.role}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === member.id ? { ...x, role: e.target.value } : x))
                  )
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Note (Hidden in Collage)
            </label>
            <Input
              value={member.specialty}
              placeholder="Kept for internal reference; collage shows Name, Role & Portrait only"
              onChange={(e) =>
                onChange(
                  items.map((x) =>
                    x.id === member.id ? { ...x, specialty: e.target.value } : x
                  )
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Portrait URL</label>
            <Input
              value={member.image}
              onChange={(e) =>
                onChange(
                  items.map((x) => (x.id === member.id ? { ...x, image: e.target.value } : x))
                )
              }
            />
            <ImageUploadAndPresets
              uploadKey={member.id}
              uploadingField={uploadingField}
              presets={ABOUT_PRESET_IMAGES.slice(5)}
              onUpload={(file) =>
                onUploadFile(file, member.id, (url) =>
                  onChange(items.map((x) => (x.id === member.id ? { ...x, image: url } : x)))
                )
              }
              onSelectPreset={(url) =>
                onChange(items.map((x) => (x.id === member.id ? { ...x, image: url } : x)))
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const INTERVAL_PRESETS = [
  { label: "Fast (1.8s)", ms: 1800 },
  { label: "Brisk (2.8s)", ms: 2800 },
  { label: "Balanced (3.8s)", ms: 3800 },
  { label: "Calm (5.5s)", ms: 5500 },
  { label: "Relaxed (7.5s)", ms: 7500 },
];

function IntervalSpeedControl({
  id,
  label,
  description,
  speedMs,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  speedMs: number;
  onChange: (nextMs: number) => void;
}) {
  const safeSeconds = Number((clampSlideshowSpeedMs(speedMs) / 1000).toFixed(1));
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs font-bold text-[#22577A]">{label}</div>
          <div className="text-xs text-slate-600">{description}</div>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            Interval (sec):
          </label>
          <InputNumber
            id={id}
            min={1.5}
            max={20}
            step={0.5}
            value={safeSeconds}
            onChange={(val) => {
              if (typeof val === "number") {
                onChange(clampSlideshowSpeedMs(val * 1000, speedMs));
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
        value={safeSeconds}
        onChange={(val) => onChange(clampSlideshowSpeedMs(val * 1000, speedMs))}
      />

      <div className="flex flex-wrap items-center gap-2">
        {INTERVAL_PRESETS.map((preset) => {
          const isActive = clampSlideshowSpeedMs(speedMs) === preset.ms;
          return (
            <button
              key={preset.ms}
              type="button"
              onClick={() => onChange(preset.ms)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
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
  );
}

export function JourneyEditorTab({
  items,
  onChange,
  journeySpeedMs,
  onJourneySpeedChange,
}: {
  items: JourneyMilestoneItem[];
  onChange: (next: JourneyMilestoneItem[]) => void;
  journeySpeedMs: number;
  onJourneySpeedChange: (nextMs: number) => void;
}) {
  const handleAdd = () => {
    onChange([
      ...items,
      {
        id: `journey-${Date.now()}`,
        year: "2026",
        title: "Architectural Milestone",
        summary: "Expanded regional fabrication capacity with sustainable low-carbon extrusions.",
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <IntervalSpeedControl
        id="journey-roadmap-speed"
        label="Roadmap Auto-Run Speed"
        description="Controls how fast the animated Our Journey roadmap advances between milestone stops."
        speedMs={journeySpeedMs}
        onChange={onJourneySpeedChange}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">
          Add, edit, reorder, or delete roadmap stops shown on Our Journey.
        </span>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Milestone
        </Button>
      </div>

      {items.map((item, idx) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
        >
          <ItemHeader
            label={`Milestone ${idx + 1} (${item.year})`}
            index={idx}
            total={items.length}
            onMoveUp={() => onChange(moveArrayItem(items, idx, -1))}
            onMoveDown={() => onChange(moveArrayItem(items, idx, 1))}
            onDelete={() =>
              items.length > 1 && onChange(items.filter((x) => x.id !== item.id))
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <Input
                value={item.year}
                onChange={(e) =>
                  onChange(items.map((x) => (x.id === item.id ? { ...x, year: e.target.value } : x)))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <Input
                value={item.title}
                onChange={(e) =>
                  onChange(items.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)))
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
            <TextArea
              rows={2}
              value={item.summary}
              onChange={(e) =>
                onChange(
                  items.map((x) => (x.id === item.id ? { ...x, summary: e.target.value } : x))
                )
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RibbonSpeedControl({
  id,
  label,
  description,
  speed,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  speed: number;
  onChange: (nextSpeed: number) => void;
}) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs font-bold text-[#22577A]">{label}</div>
          <div className="text-xs text-slate-600">{description}</div>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            Speed (px/s):
          </label>
          <InputNumber
            id={id}
            min={MIN_RIBBON_SPEED}
            max={MAX_RIBBON_SPEED}
            step={5}
            value={speed}
            onChange={(val) => {
              if (typeof val === "number") {
                onChange(clampRibbonSpeed(val, speed));
              }
            }}
            style={{ width: 90 }}
          />
        </div>
      </div>

      <Slider
        min={MIN_RIBBON_SPEED}
        max={MAX_RIBBON_SPEED}
        step={5}
        value={speed}
        onChange={(val) => onChange(clampRibbonSpeed(val, speed))}
      />

      <div className="flex flex-wrap items-center gap-2">
        {RIBBON_SPEED_PRESETS.map((preset) => {
          const isActive = speed === preset.speed;
          return (
            <button
              key={preset.speed}
              type="button"
              onClick={() => onChange(preset.speed)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
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
  );
}

export function PartnersEditorTab({
  items,
  onChange,
  ribbonSpeed,
  onRibbonSpeedChange,
  uploadingField,
  onUploadFile,
}: {
  items: PartnerItem[];
  onChange: (next: PartnerItem[]) => void;
  ribbonSpeed: number;
  onRibbonSpeedChange: (speed: number) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, key: string, onUrl: (url: string) => void) => void;
}) {
  const handleAdd = () => {
    const idx = items.length;
    const preset = ABOUT_PARTNER_LOGO_PRESETS[idx % ABOUT_PARTNER_LOGO_PRESETS.length];
    const cycleScales = [0.85, 1.25, 1.0, 1.4];
    onChange([
      ...items,
      {
        id: `partner-${Date.now()}`,
        name: `Partner Brand ${idx + 1}`,
        category: "Architectural Systems",
        description: "Architectural extrusion and glazing partner.",
        logo: preset.url,
        scale: cycleScales[idx % cycleScales.length],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <RibbonSpeedControl
        id="partners-ribbon-speed"
        label="Partners Logo Ribbon Speed"
        description="Controls automatic horizontal sliding speed for the logos-only Partners ribbon."
        speed={ribbonSpeed}
        onChange={onRibbonSpeedChange}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">
          Add, edit, scale, reorder, or delete partner logos (logos-only ribbon display).
        </span>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Partner Logo
        </Button>
      </div>

      {items.map((partner, idx) => {
        const currentScale = clampLogoScale(partner.scale, DEFAULT_LOGO_SCALE);
        const previewHeight = Math.round(36 * currentScale);

        return (
          <div
            key={partner.id}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
          >
            <ItemHeader
              label={`Partner Logo ${idx + 1}: ${partner.name || "Untitled"} (${currentScale}x)`}
              index={idx}
              total={items.length}
              onMoveUp={() => onChange(moveArrayItem(items, idx, -1))}
              onMoveDown={() => onChange(moveArrayItem(items, idx, 1))}
              onDelete={() =>
                items.length > 1 && onChange(items.filter((x) => x.id !== partner.id))
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand Alt Label
                </label>
                <Input
                  value={partner.name}
                  onChange={(e) =>
                    onChange(
                      items.map((x) => (x.id === partner.id ? { ...x, name: e.target.value } : x))
                    )
                  }
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo Scale Preset
                </label>
                <Select
                  value={
                    LOGO_SCALE_OPTIONS.some((opt) => opt.value === currentScale)
                      ? currentScale
                      : undefined
                  }
                  placeholder={`${currentScale}x Custom`}
                  style={{ width: "100%" }}
                  onChange={(val) =>
                    onChange(
                      items.map((x) =>
                        x.id === partner.id ? { ...x, scale: clampLogoScale(val) } : x
                      )
                    )
                  }
                  options={LOGO_SCALE_OPTIONS}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Scale
                </label>
                <InputNumber
                  min={MIN_LOGO_SCALE}
                  max={MAX_LOGO_SCALE}
                  step={0.05}
                  value={currentScale}
                  style={{ width: "100%" }}
                  onChange={(val) => {
                    if (typeof val === "number") {
                      onChange(
                        items.map((x) =>
                          x.id === partner.id ? { ...x, scale: clampLogoScale(val) } : x
                        )
                      );
                    }
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-white border border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[11px] font-medium text-slate-500">Scaled Preview</span>
              <div className="h-[68px] flex items-center justify-center">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  style={{ height: `${previewHeight}px`, width: "auto" }}
                  className="object-contain block"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Partner Logo URL (SVG / PNG)
              </label>
              <Input
                value={partner.logo}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === partner.id ? { ...x, logo: e.target.value } : x))
                  )
                }
              />
              <ImageUploadAndPresets
                uploadKey={partner.id}
                uploadingField={uploadingField}
                presets={ABOUT_PARTNER_LOGO_PRESETS}
                onUpload={(file) =>
                  onUploadFile(file, partner.id, (url) =>
                    onChange(items.map((x) => (x.id === partner.id ? { ...x, logo: url } : x)))
                  )
                }
                onSelectPreset={(url) =>
                  onChange(items.map((x) => (x.id === partner.id ? { ...x, logo: url } : x)))
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientsEditorTab({
  items,
  onChange,
  ribbonSpeed,
  onRibbonSpeedChange,
  uploadingField,
  onUploadFile,
}: {
  items: ClientItem[];
  onChange: (next: ClientItem[]) => void;
  ribbonSpeed: number;
  onRibbonSpeedChange: (speed: number) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, key: string, onUrl: (url: string) => void) => void;
}) {
  const handleAdd = () => {
    const idx = items.length;
    const preset = ABOUT_CLIENT_LOGO_PRESETS[idx % ABOUT_CLIENT_LOGO_PRESETS.length];
    const cycleScales = [1.2, 0.82, 1.38, 0.95];
    onChange([
      ...items,
      {
        id: `client-${Date.now()}`,
        name: `Client Brand ${idx + 1}`,
        sector: "Commercial & Residential",
        projectScope: "Custom Facade Glazing & Sliding Suites",
        logo: preset.url,
        scale: cycleScales[idx % cycleScales.length],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <RibbonSpeedControl
        id="clients-ribbon-speed"
        label="Clients Logo Ribbon Speed"
        description="Controls automatic horizontal sliding speed for the logos-only Clients ribbon."
        speed={ribbonSpeed}
        onChange={onRibbonSpeedChange}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">
          Add, edit, scale, reorder, or delete client logos (logos-only ribbon display).
        </span>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Client Logo
        </Button>
      </div>

      {items.map((client, idx) => {
        const currentScale = clampLogoScale(client.scale, DEFAULT_LOGO_SCALE);
        const previewHeight = Math.round(36 * currentScale);

        return (
          <div
            key={client.id}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
          >
            <ItemHeader
              label={`Client Logo ${idx + 1}: ${client.name || "Untitled"} (${currentScale}x)`}
              index={idx}
              total={items.length}
              onMoveUp={() => onChange(moveArrayItem(items, idx, -1))}
              onMoveDown={() => onChange(moveArrayItem(items, idx, 1))}
              onDelete={() =>
                items.length > 1 && onChange(items.filter((x) => x.id !== client.id))
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Alt Label
                </label>
                <Input
                  value={client.name}
                  onChange={(e) =>
                    onChange(
                      items.map((x) => (x.id === client.id ? { ...x, name: e.target.value } : x))
                    )
                  }
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo Scale Preset
                </label>
                <Select
                  value={
                    LOGO_SCALE_OPTIONS.some((opt) => opt.value === currentScale)
                      ? currentScale
                      : undefined
                  }
                  placeholder={`${currentScale}x Custom`}
                  style={{ width: "100%" }}
                  onChange={(val) =>
                    onChange(
                      items.map((x) =>
                        x.id === client.id ? { ...x, scale: clampLogoScale(val) } : x
                      )
                    )
                  }
                  options={LOGO_SCALE_OPTIONS}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Scale
                </label>
                <InputNumber
                  min={MIN_LOGO_SCALE}
                  max={MAX_LOGO_SCALE}
                  step={0.05}
                  value={currentScale}
                  style={{ width: "100%" }}
                  onChange={(val) => {
                    if (typeof val === "number") {
                      onChange(
                        items.map((x) =>
                          x.id === client.id ? { ...x, scale: clampLogoScale(val) } : x
                        )
                      );
                    }
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-white border border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[11px] font-medium text-slate-500">Scaled Preview</span>
              <div className="h-[68px] flex items-center justify-center">
                <img
                  src={client.logo}
                  alt={client.name}
                  style={{ height: `${previewHeight}px`, width: "auto" }}
                  className="object-contain block"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Logo URL (SVG / PNG)
              </label>
              <Input
                value={client.logo}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === client.id ? { ...x, logo: e.target.value } : x))
                  )
                }
              />
              <ImageUploadAndPresets
                uploadKey={client.id}
                uploadingField={uploadingField}
                presets={ABOUT_CLIENT_LOGO_PRESETS}
                onUpload={(file) =>
                  onUploadFile(file, client.id, (url) =>
                    onChange(items.map((x) => (x.id === client.id ? { ...x, logo: url } : x)))
                  )
                }
                onSelectPreset={(url) =>
                  onChange(items.map((x) => (x.id === client.id ? { ...x, logo: url } : x)))
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FeedbacksEditorTab({
  items,
  onChange,
  feedbackSpeedMs,
  onFeedbackSpeedChange,
  uploadingField,
  onUploadFile,
}: {
  items: ClientFeedbackItem[];
  onChange: (next: ClientFeedbackItem[]) => void;
  feedbackSpeedMs: number;
  onFeedbackSpeedChange: (nextMs: number) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, key: string, onUrl: (url: string) => void) => void;
}) {
  const handleAdd = () => {
    onChange([
      ...items,
      {
        id: `fb-${Date.now()}`,
        clientName: "Priyantha Silva",
        role: "Managing Director",
        company: "Lanka Estates Group",
        project: "Bespoke Atrium Glazing",
        rating: 5,
        comment:
          "Clean engineering drawings, reliable scheduling, and spotless installation across our atrium enclosures.",
        image: ABOUT_PRESET_IMAGES[3].url,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <IntervalSpeedControl
        id="client-feedbacks-speed"
        label="Client Feedbacks Auto-Slide Speed"
        description="Controls automatic card-stack transition speed for the Client Feedbacks showcase."
        speedMs={feedbackSpeedMs}
        onChange={onFeedbackSpeedChange}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">
          Add, edit, reorder, or delete client testimonials shown on Client Feedbacks.
        </span>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Feedback
        </Button>
      </div>

      {items.map((fb, idx) => (
        <div
          key={fb.id}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
        >
          <ItemHeader
            label={`Feedback ${idx + 1}: ${fb.clientName || "Client"}`}
            index={idx}
            total={items.length}
            onMoveUp={() => onChange(moveArrayItem(items, idx, -1))}
            onMoveDown={() => onChange(moveArrayItem(items, idx, 1))}
            onDelete={() =>
              items.length > 1 && onChange(items.filter((x) => x.id !== fb.id))
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name</label>
              <Input
                value={fb.clientName}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === fb.id ? { ...x, clientName: e.target.value } : x))
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <Input
                value={fb.role}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === fb.id ? { ...x, role: e.target.value } : x))
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <Input
                value={fb.company}
                onChange={(e) =>
                  onChange(
                    items.map((x) => (x.id === fb.id ? { ...x, company: e.target.value } : x))
                  )
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project & Rating</label>
              <div className="flex gap-2">
                <Input
                  value={fb.project}
                  onChange={(e) =>
                    onChange(
                      items.map((x) => (x.id === fb.id ? { ...x, project: e.target.value } : x))
                    )
                  }
                />
                <Select
                  value={fb.rating}
                  style={{ width: 90 }}
                  onChange={(val) =>
                    onChange(items.map((x) => (x.id === fb.id ? { ...x, rating: val } : x)))
                  }
                  options={[5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: n }))}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Testimonial Comment</label>
            <TextArea
              rows={2}
              value={fb.comment}
              onChange={(e) =>
                onChange(
                  items.map((x) => (x.id === fb.id ? { ...x, comment: e.target.value } : x))
                )
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Image URL</label>
            <Input
              value={fb.image}
              onChange={(e) =>
                onChange(items.map((x) => (x.id === fb.id ? { ...x, image: e.target.value } : x)))
              }
            />
            <ImageUploadAndPresets
              uploadKey={fb.id}
              uploadingField={uploadingField}
              onUpload={(file) =>
                onUploadFile(file, fb.id, (url) =>
                  onChange(items.map((x) => (x.id === fb.id ? { ...x, image: url } : x)))
                )
              }
              onSelectPreset={(url) =>
                onChange(items.map((x) => (x.id === fb.id ? { ...x, image: url } : x)))
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
