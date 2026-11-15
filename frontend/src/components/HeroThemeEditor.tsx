import { useEffect, useMemo, useState } from "react";
import { Button, Input, Select, Slider, Switch } from "antd";
import { BgColorsOutlined, CopyOutlined, ReloadOutlined } from "@ant-design/icons";
import RgbColorControl from "./RgbColorControl";
import {
  DEFAULT_HERO_THEME,
  HERO_THEME_PRESETS,
  applySameColorToTheme,
  buildCategoryAccentFillCss,
  buildGradientExpression,
  buildHeroBackgroundCss,
  buildHeroImageMaskCss,
  clampAngleDeg,
  clampPercent,
  describeHeroThemeSummary,
  extractFirstColorFromCss,
  getHeroBackdropBaseColor,
  normalizeHeroTheme,
  pickReadableSubheadlineColor,
  pickReadableTextColor,
  sanitizeCustomCssGradient,
  type HeroColorMode,
  type HeroThemeConfig,
} from "../../../shared/heroThemeHelpers";

export interface HeroThemeCopySource {
  id: string;
  label: string;
  theme: HeroThemeConfig;
}

interface HeroThemeEditorProps {
  value?: Partial<HeroThemeConfig> | null;
  onChange: (next: HeroThemeConfig) => void;
  title?: string;
  subtitle?: string;
  previewHeadline?: string;
  previewSubheadline?: string;
  previewImage?: string;
  copySources?: HeroThemeCopySource[];
  onApplyToAll?: (theme: HeroThemeConfig) => void | Promise<void>;
  applyToAllLabel?: string;
  applyingToAll?: boolean;
  compact?: boolean;
}

export default function HeroThemeEditor({
  value,
  onChange,
  title = "Colors",
  previewHeadline = "Architectural Precision Starts Here",
  previewSubheadline = "Precision aluminium & glazing systems.",
  previewImage = "/assets/about/facade.jpg",
  copySources = [],
  onApplyToAll,
  applyToAllLabel = "Apply",
  applyingToAll = false,
  compact = false,
}: HeroThemeEditorProps) {
  const theme = useMemo(() => normalizeHeroTheme(value, DEFAULT_HERO_THEME), [value]);
  const [cssDraft, setCssDraft] = useState<string>(theme.customCssGradient);
  const [cssFocused, setCssFocused] = useState(false);
  const [customCssError, setCustomCssError] = useState(false);

  useEffect(() => {
    if (!cssFocused) {
      setCssDraft(theme.customCssGradient);
      setCustomCssError(false);
    }
  }, [theme.customCssGradient, cssFocused]);

  const patchTheme = (partial: Partial<HeroThemeConfig>) => {
    const merged = normalizeHeroTheme({ ...theme, ...partial }, theme);
    if (merged.mode === "gradient" && partial.customCssGradient === undefined) {
      merged.customCssGradient = buildGradientExpression(merged);
    } else if (merged.mode === "solid" && partial.customCssGradient === undefined) {
      merged.customCssGradient = buildHeroBackgroundCss(merged);
    }
    onChange(merged);
  };

  const handleModeChange = (nextMode: HeroColorMode) => {
    if (nextMode === "solid") {
      const next = applySameColorToTheme(theme, theme.startColor, theme.fadeToPageBottom);
      setCssDraft(next.customCssGradient);
      setCustomCssError(false);
      onChange(next);
      return;
    }
    if (nextMode === "custom") {
      const seedCss =
        theme.mode === "solid"
          ? buildHeroBackgroundCss(theme)
          : theme.customCssGradient || buildGradientExpression(theme);
      setCssDraft(seedCss);
      setCustomCssError(false);
      patchTheme({
        mode: "custom",
        customCssGradient: seedCss,
      });
      return;
    }
    patchTheme({ mode: "gradient" });
  };

  const handleAutoContrast = () => {
    const baseBg = getHeroBackdropBaseColor(theme);
    const headlineColor = pickReadableTextColor(baseBg);
    const subheadlineColor = pickReadableSubheadlineColor(baseBg);
    patchTheme({ headlineColor, subheadlineColor });
  };

  const handleCopyFromSource = (sourceId: string) => {
    const found = copySources.find((src) => src.id === sourceId);
    if (!found) return;
    const normalized = normalizeHeroTheme(found.theme, DEFAULT_HERO_THEME);
    setCssDraft(normalized.customCssGradient);
    setCustomCssError(false);
    onChange(normalized);
  };

  const backgroundCss = buildHeroBackgroundCss(theme);
  const maskCss = buildHeroImageMaskCss(theme);
  const accentFillCss = buildCategoryAccentFillCss(theme);
  const baseColorHex = getHeroBackdropBaseColor(theme);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-4 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BgColorsOutlined className="text-[#22577A]" />
          <h4 className="text-sm font-bold text-slate-900 m-0">{title}</h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {copySources.length > 0 && (
            <Select
              size="small"
              placeholder="Copy"
              value={undefined}
              onChange={handleCopyFromSource}
              style={{ minWidth: 120 }}
              options={copySources.map((src) => ({
                label: src.label,
                value: src.id,
              }))}
            />
          )}

          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => {
              setCssDraft(DEFAULT_HERO_THEME.customCssGradient);
              setCustomCssError(false);
              onChange({ ...DEFAULT_HERO_THEME });
            }}
          >
            Reset
          </Button>

          {onApplyToAll && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CopyOutlined />}
              loading={applyingToAll}
              onClick={() => onApplyToAll(theme)}
            >
              {applyToAllLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs"
        aria-label="Preview"
      >
        <div
          style={{ background: backgroundCss }}
          className={`relative overflow-hidden ${compact ? "pt-4 px-4" : "pt-5 px-5"}`}
        >
          <div className="relative z-10 text-center max-w-md mx-auto">
            <div
              style={{ color: theme.headlineColor }}
              className="text-base sm:text-lg font-bold tracking-tight leading-snug"
            >
              {previewHeadline}
            </div>
            <div
              style={{ color: theme.subheadlineColor }}
              className="text-[11px] mt-1 line-clamp-1"
            >
              {previewSubheadline}
            </div>
          </div>

          <div className={`relative -mt-1 w-full overflow-hidden ${compact ? "h-16" : "h-24"}`}>
            <img
              src={previewImage}
              alt="Preview"
              referrerPolicy="no-referrer"
              style={{
                maskImage: maskCss === "none" ? undefined : maskCss,
                WebkitMaskImage: maskCss === "none" ? undefined : maskCss,
              }}
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>

        <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
              style={{ background: accentFillCss }}
            />
            <span className="text-[11px] font-medium text-slate-600">
              {describeHeroThemeSummary(theme)}
            </span>
          </div>
          <span
            style={{
              background: accentFillCss,
              color: pickReadableTextColor(theme.accentColor || baseColorHex),
            }}
            className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold"
          >
            Preview
          </span>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HERO_THEME_PRESETS.map((preset) => {
            const isActive =
              theme.mode === preset.theme.mode &&
              theme.startColor === preset.theme.startColor &&
              theme.endColor === preset.theme.endColor;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setCssDraft(preset.theme.customCssGradient);
                  setCustomCssError(false);
                  onChange({ ...preset.theme });
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#22577A] text-white border-[#22577A] shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8]"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/70 shrink-0"
                  style={{ background: buildHeroBackgroundCss(preset.theme) }}
                />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="space-y-2">
        <div
          role="tablist"
          aria-label="Mode"
          className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-200/75 p-1"
        >
          {(
            [
              { key: "gradient", label: "Gradient" },
              { key: "solid", label: "Solid" },
              { key: "custom", label: "CSS" },
            ] as const
          ).map((tab) => {
            const active = theme.mode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleModeChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-[#22577A] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mode 1: Gradient */}
        {theme.mode === "gradient" && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shape
                </label>
                <div className="flex gap-2">
                  {(["linear", "radial"] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => patchTheme({ gradientShape: shape })}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                        theme.gradientShape === shape
                          ? "bg-[#22577A] text-white border-[#22577A]"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Angle</span>
                  <span className="font-mono text-[#22577A]">{theme.angleDeg}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Slider
                      min={0}
                      max={360}
                      step={5}
                      disabled={theme.gradientShape === "radial"}
                      value={theme.angleDeg}
                      onChange={(deg) =>
                        patchTheme({ angleDeg: clampAngleDeg(deg, 180) })
                      }
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={360}
                    aria-label="Angle"
                    disabled={theme.gradientShape === "radial"}
                    value={theme.angleDeg}
                    onChange={(e) =>
                      patchTheme({ angleDeg: clampAngleDeg(e.target.value, 180) })
                    }
                    className="w-16 h-8 px-2 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <RgbColorControl
                  label="Start"
                  value={theme.startColor}
                  showSwatches
                  onChange={(nextHex) =>
                    patchTheme({
                      startColor: nextHex,
                      accentColor:
                        nextHex === "#FFFFFF" ? theme.accentColor : nextHex,
                    })
                  }
                />
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-600">
                  <span>Position</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      aria-label="Start Position"
                      value={theme.startStopPercent}
                      onChange={(e) =>
                        patchTheme({
                          startStopPercent: clampPercent(e.target.value, 0),
                        })
                      }
                      className="w-14 px-1.5 py-0.5 rounded border border-slate-200 text-right font-mono"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700">End</span>
                  <button
                    type="button"
                    onClick={() => patchTheme({ endColor: "#FFFFFF" })}
                    className="text-[11px] font-semibold text-[#22577A] hover:underline cursor-pointer"
                  >
                    White
                  </button>
                </div>
                <RgbColorControl
                  label="End"
                  value={theme.endColor}
                  onChange={(nextHex) => patchTheme({ endColor: nextHex })}
                />
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-600">
                  <span>Position</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      aria-label="End Position"
                      value={theme.endStopPercent}
                      onChange={(e) =>
                        patchTheme({
                          endStopPercent: clampPercent(e.target.value, 100),
                        })
                      }
                      className="w-14 px-1.5 py-0.5 rounded border border-slate-200 text-right font-mono"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    size="small"
                    checked={theme.useMidColor}
                    onChange={(checked) => patchTheme({ useMidColor: checked })}
                  />
                  <span className="text-xs font-semibold text-slate-700">Middle</span>
                </div>
                {theme.useMidColor && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-600">
                    <span>Position</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      aria-label="Middle Position"
                      value={theme.midStopPercent}
                      onChange={(e) =>
                        patchTheme({
                          midStopPercent: clampPercent(e.target.value, 50),
                        })
                      }
                      className="w-14 px-1.5 py-0.5 rounded border border-slate-200 text-right font-mono"
                    />
                    <span>%</span>
                  </div>
                )}
              </div>

              {theme.useMidColor && (
                <RgbColorControl
                  label="Middle"
                  value={theme.midColor}
                  compact
                  onChange={(nextHex) => patchTheme({ midColor: nextHex })}
                />
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Solid */}
        {theme.mode === "solid" && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <RgbColorControl
              label="Color"
              value={theme.startColor}
              showSwatches
              onChange={(nextHex) =>
                onChange(
                  applySameColorToTheme(theme, nextHex, theme.fadeToPageBottom)
                )
              }
            />

            <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="text-xs font-semibold text-slate-800">Fade</span>
              <Switch
                checked={theme.fadeToPageBottom}
                onChange={(checked) =>
                  patchTheme({
                    fadeToPageBottom: checked,
                    endColor: checked ? "#FFFFFF" : theme.startColor,
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Mode 3: CSS */}
        {theme.mode === "custom" && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="hero-custom-css-input"
                className="text-xs font-bold text-slate-800"
              >
                CSS
              </label>
              <Button
                size="small"
                onClick={() => {
                  const generated = buildGradientExpression(theme);
                  setCssDraft(generated);
                  setCustomCssError(false);
                  patchTheme({ mode: "custom", customCssGradient: generated });
                }}
              >
                Generate
              </Button>
            </div>
            <Input.TextArea
              id="hero-custom-css-input"
              rows={2}
              value={cssDraft}
              placeholder="linear-gradient(135deg, rgb(16, 42, 66) 0%, rgb(92, 182, 210) 100%)"
              onFocus={() => setCssFocused(true)}
              onChange={(e) => {
                const raw = e.target.value;
                setCssDraft(raw);
                const sanitized = sanitizeCustomCssGradient(raw, "__INVALID__");
                if (sanitized === "__INVALID__") {
                  setCustomCssError(raw.trim().length > 0);
                } else {
                  setCustomCssError(false);
                  const extractedHex = extractFirstColorFromCss(sanitized);
                  patchTheme({
                    mode: "custom",
                    customCssGradient: sanitized,
                    ...(extractedHex
                      ? {
                          accentColor:
                            extractedHex === "#FFFFFF"
                              ? theme.accentColor
                              : extractedHex,
                        }
                      : {}),
                  });
                }
              }}
              onBlur={() => {
                setCssFocused(false);
                const sanitized = sanitizeCustomCssGradient(cssDraft, "__INVALID__");
                if (sanitized !== "__INVALID__") {
                  setCssDraft(sanitized);
                  setCustomCssError(false);
                  const extractedHex = extractFirstColorFromCss(sanitized);
                  patchTheme({
                    mode: "custom",
                    customCssGradient: sanitized,
                    ...(extractedHex
                      ? {
                          accentColor:
                            extractedHex === "#FFFFFF"
                              ? theme.accentColor
                              : extractedHex,
                        }
                      : {}),
                  });
                } else if (!cssDraft.trim()) {
                  setCssDraft(theme.customCssGradient);
                  setCustomCssError(false);
                } else {
                  setCustomCssError(true);
                }
              }}
              className="font-mono text-xs"
            />
            {customCssError && (
              <div className="text-[11px] text-amber-700 font-medium">
                Invalid CSS
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text & Image Blend */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800">Text</div>
          <Button size="small" onClick={handleAutoContrast}>
            Contrast
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <RgbColorControl
            label="Headline"
            value={theme.headlineColor}
            compact
            onChange={(nextHex) => patchTheme({ headlineColor: nextHex })}
          />
          <RgbColorControl
            label="Subtitle"
            value={theme.subheadlineColor}
            compact
            onChange={(nextHex) => patchTheme({ subheadlineColor: nextHex })}
          />
          <RgbColorControl
            label="Accent"
            value={theme.accentColor}
            compact
            onChange={(nextHex) => patchTheme({ accentColor: nextHex })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Top</span>
              <span className="font-mono text-[#22577A]">
                {theme.imageBlendTopPercent}%
              </span>
            </div>
            <Slider
              min={0}
              max={45}
              step={1}
              value={theme.imageBlendTopPercent}
              onChange={(val) =>
                patchTheme({ imageBlendTopPercent: clampPercent(val, 26, 0, 45) })
              }
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Bottom</span>
              <span className="font-mono text-[#22577A]">
                {theme.imageBlendBottomPercent}%
              </span>
            </div>
            <Slider
              min={0}
              max={35}
              step={1}
              value={theme.imageBlendBottomPercent}
              onChange={(val) =>
                patchTheme({
                  imageBlendBottomPercent: clampPercent(val, 20, 0, 35),
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
