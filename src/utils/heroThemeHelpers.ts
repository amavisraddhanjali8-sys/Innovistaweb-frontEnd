export type HeroColorMode = "gradient" | "solid" | "custom";
export type HeroGradientShape = "linear" | "radial";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HeroThemeConfig {
  mode: HeroColorMode;
  startColor: string;
  midColor: string;
  useMidColor: boolean;
  endColor: string;
  fadeToPageBottom: boolean;
  gradientShape: HeroGradientShape;
  angleDeg: number;
  startStopPercent: number;
  midStopPercent: number;
  endStopPercent: number;
  customCssGradient: string;
  headlineColor: string;
  subheadlineColor: string;
  accentColor: string;
  imageBlendTopPercent: number;
  imageBlendBottomPercent: number;
}

export interface HeroThemePreset {
  id: string;
  name: string;
  subtitle: string;
  theme: HeroThemeConfig;
}

export const DEFAULT_HERO_THEME: HeroThemeConfig = {
  mode: "gradient",
  startColor: "#3393B8",
  midColor: "#5CB6D2",
  useMidColor: true,
  endColor: "#FFFFFF",
  fadeToPageBottom: true,
  gradientShape: "linear",
  angleDeg: 180,
  startStopPercent: 0,
  midStopPercent: 50,
  endStopPercent: 100,
  customCssGradient:
    "linear-gradient(180deg, rgb(51, 147, 184) 0%, rgb(92, 182, 210) 50%, rgb(255, 255, 255) 100%)",
  headlineColor: "#FFFFFF",
  subheadlineColor: "#F1F5F9",
  accentColor: "#3393B8",
  imageBlendTopPercent: 26,
  imageBlendBottomPercent: 20,
};

export const HERO_THEME_PRESETS: HeroThemePreset[] = [
  {
    id: "ocean-default",
    name: "Ocean",
    subtitle: "Ocean gradient",
    theme: { ...DEFAULT_HERO_THEME },
  },
  {
    id: "harbour-navy",
    name: "Navy",
    subtitle: "Navy gradient",
    theme: {
      ...DEFAULT_HERO_THEME,
      mode: "gradient",
      startColor: "#102A42",
      midColor: "#22577A",
      useMidColor: true,
      endColor: "#FFFFFF",
      angleDeg: 180,
      customCssGradient:
        "linear-gradient(180deg, rgb(16, 42, 66) 0%, rgb(34, 87, 122) 52%, rgb(255, 255, 255) 100%)",
      headlineColor: "#FFFFFF",
      subheadlineColor: "#E2E8F0",
      accentColor: "#22577A",
    },
  },
  {
    id: "charcoal-slate",
    name: "Graphite",
    subtitle: "Graphite gradient",
    theme: {
      ...DEFAULT_HERO_THEME,
      mode: "gradient",
      startColor: "#14171A",
      midColor: "#334155",
      useMidColor: true,
      endColor: "#FFFFFF",
      angleDeg: 180,
      customCssGradient:
        "linear-gradient(180deg, rgb(20, 23, 26) 0%, rgb(51, 65, 85) 54%, rgb(255, 255, 255) 100%)",
      headlineColor: "#FFFFFF",
      subheadlineColor: "#E2E8F0",
      accentColor: "#1E293B",
    },
  },
  {
    id: "champagne-bronze",
    name: "Bronze",
    subtitle: "Bronze gradient",
    theme: {
      ...DEFAULT_HERO_THEME,
      mode: "gradient",
      startColor: "#5C432C",
      midColor: "#926B46",
      useMidColor: true,
      endColor: "#FFFFFF",
      angleDeg: 180,
      customCssGradient:
        "linear-gradient(180deg, rgb(92, 67, 44) 0%, rgb(146, 107, 70) 52%, rgb(255, 255, 255) 100%)",
      headlineColor: "#FFFFFF",
      subheadlineColor: "#FEF3C7",
      accentColor: "#926B46",
    },
  },
  {
    id: "crimson-studio",
    name: "Crimson",
    subtitle: "Crimson gradient",
    theme: {
      ...DEFAULT_HERO_THEME,
      mode: "gradient",
      startColor: "#991B1B",
      midColor: "#22577A",
      useMidColor: true,
      endColor: "#FFFFFF",
      angleDeg: 135,
      customCssGradient:
        "linear-gradient(135deg, rgb(153, 27, 27) 0%, rgb(34, 87, 122) 55%, rgb(255, 255, 255) 100%)",
      headlineColor: "#FFFFFF",
      subheadlineColor: "#F8FAFC",
      accentColor: "#B91C1C",
    },
  },
  {
    id: "solid-navy",
    name: "Solid",
    subtitle: "Solid navy",
    theme: {
      ...DEFAULT_HERO_THEME,
      mode: "solid",
      startColor: "#22577A",
      midColor: "#22577A",
      useMidColor: false,
      endColor: "#22577A",
      fadeToPageBottom: false,
      customCssGradient: "rgb(34, 87, 122)",
      headlineColor: "#FFFFFF",
      subheadlineColor: "#E2E8F0",
      accentColor: "#22577A",
    },
  },
  {
    id: "minimal-frost-solid",
    name: "Frost",
    subtitle: "Frost solid",
    theme: {
      ...DEFAULT_HERO_THEME,
      mode: "solid",
      startColor: "#E2E8F0",
      midColor: "#E2E8F0",
      useMidColor: false,
      endColor: "#FFFFFF",
      fadeToPageBottom: true,
      customCssGradient: "rgb(226, 232, 240)",
      headlineColor: "#0F172A",
      subheadlineColor: "#334155",
      accentColor: "#22577A",
    },
  },
];

export const QUICK_ARCHITECTURAL_SWATCHES: Array<{
  label: string;
  hex: string;
}> = [
  { label: "Brand Navy", hex: "#22577A" },
  { label: "Ocean Blue", hex: "#3393B8" },
  { label: "Sky Cyan", hex: "#5CB6D2" },
  { label: "Deep Harbour", hex: "#102A42" },
  { label: "Signal Red", hex: "#E60000" },
  { label: "Charcoal", hex: "#1F2937" },
  { label: "Champagne Bronze", hex: "#926B46" },
  { label: "Silver Mist", hex: "#CBD5E1" },
  { label: "Pure White", hex: "#FFFFFF" },
];

export function clampByte(raw: unknown, fallback = 0): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function clampPercent(
  raw: unknown,
  fallback = 0,
  min = 0,
  max = 100
): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function clampAngleDeg(raw: unknown, fallback = 180): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 0) return ((rounded % 360) + 360) % 360;
  if (rounded > 360) return rounded % 360;
  return rounded;
}

function hslToRgb(h: number, sPct: number, lPct: number): RgbColor {
  const hue = (((h % 360) + 360) % 360) / 360;
  const s = Math.min(100, Math.max(0, sPct)) / 100;
  const l = Math.min(100, Math.max(0, lPct)) / 100;

  if (s === 0) {
    const v = clampByte(l * 255);
    return { r: v, g: v, b: v };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (tRaw: number) => {
    let t = tRaw;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return {
    r: clampByte(hue2rgb(hue + 1 / 3) * 255),
    g: clampByte(hue2rgb(hue) * 255),
    b: clampByte(hue2rgb(hue - 1 / 3) * 255),
  };
}

/**
 * Parses hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(r,g,b), rgba(r,g,b,a), hsl(h,s%,l%),
 * or bare RGB numbers ("51, 147, 184" or "51 147 184") into { r, g, b }.
 */
export function parseColorInput(raw: unknown): RgbColor | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Hex with or without '#'
  const hexCandidate = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{3}$/.test(hexCandidate)) {
    return {
      r: parseInt(hexCandidate[0] + hexCandidate[0], 16),
      g: parseInt(hexCandidate[1] + hexCandidate[1], 16),
      b: parseInt(hexCandidate[2] + hexCandidate[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(hexCandidate) || /^[0-9a-fA-F]{8}$/.test(hexCandidate)) {
    return {
      r: parseInt(hexCandidate.slice(0, 2), 16),
      g: parseInt(hexCandidate.slice(2, 4), 16),
      b: parseInt(hexCandidate.slice(4, 6), 16),
    };
  }

  // 2. rgb(...) or rgba(...)
  const rgbFnMatch = trimmed.match(
    /^rgba?\(\s*([+-]?\d+(?:\.\d+)?)\s*[,\s]\s*([+-]?\d+(?:\.\d+)?)\s*[,\s]\s*([+-]?\d+(?:\.\d+)?)(?:\s*[,/]\s*[+-]?\d*(?:\.\d+)?%?)?\s*\)$/i
  );
  if (rgbFnMatch) {
    return {
      r: clampByte(Number(rgbFnMatch[1])),
      g: clampByte(Number(rgbFnMatch[2])),
      b: clampByte(Number(rgbFnMatch[3])),
    };
  }

  // 3. hsl(...) or hsla(...)
  const hslFnMatch = trimmed.match(
    /^hsla?\(\s*([+-]?\d+(?:\.\d+)?)(?:deg)?\s*[,\s]\s*([+-]?\d+(?:\.\d+)?)%\s*[,\s]\s*([+-]?\d+(?:\.\d+)?)%(?:\s*[,/]\s*[+-]?\d*(?:\.\d+)?%?)?\s*\)$/i
  );
  if (hslFnMatch) {
    return hslToRgb(
      Number(hslFnMatch[1]),
      Number(hslFnMatch[2]),
      Number(hslFnMatch[3])
    );
  }

  // 4. Bare RGB numeric triplet: "51, 147, 184" or "51 147 184" or "51/147/184"
  const bareMatch = trimmed.match(
    /^([+-]?\d{1,3})\s*[,/\s]\s*([+-]?\d{1,3})\s*[,/\s]\s*([+-]?\d{1,3})$/
  );
  if (bareMatch) {
    return {
      r: clampByte(Number(bareMatch[1])),
      g: clampByte(Number(bareMatch[2])),
      b: clampByte(Number(bareMatch[3])),
    };
  }

  return null;
}

export function rgbToHex(rgb: RgbColor): string {
  const toHex = (val: number) => clampByte(val).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function formatRgbString(rgb: RgbColor): string {
  return `rgb(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)})`;
}

export function formatRgbNumbers(rgb: RgbColor): string {
  return `${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}`;
}

export function normalizeHexColor(raw: unknown, fallback: string): string {
  const parsed = parseColorInput(raw);
  if (parsed) return rgbToHex(parsed);
  const parsedFallback = parseColorInput(fallback);
  return parsedFallback ? rgbToHex(parsedFallback) : "#3393B8";
}

export function toCssRgb(raw: unknown, fallback: string): string {
  const parsed = parseColorInput(raw) || parseColorInput(fallback) || { r: 51, g: 147, b: 184 };
  return formatRgbString(parsed);
}

export function getRelativeLuminance(rgb: RgbColor): number {
  const channel = (c: number) => {
    const s = clampByte(c) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function getContrastRatio(fg: RgbColor, bg: RgbColor): number {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function pickReadableTextColor(bgColorInput: string): "#FFFFFF" | "#0F172A" {
  const bg = parseColorInput(bgColorInput);
  if (!bg) return "#FFFFFF";
  const whiteContrast = getContrastRatio({ r: 255, g: 255, b: 255 }, bg);
  const slateContrast = getContrastRatio({ r: 15, g: 23, b: 42 }, bg);
  return whiteContrast >= slateContrast ? "#FFFFFF" : "#0F172A";
}

export function pickReadableSubheadlineColor(bgColorInput: string): string {
  return pickReadableTextColor(bgColorInput) === "#FFFFFF" ? "#F1F5F9" : "#334155";
}

/**
 * Ensures an accent color has readable contrast on light #F8FAFC surfaces (used on Category cards).
 */
export function ensureLightSurfaceAccent(accentInput: string, fallback = "#22577A"): string {
  const parsed = parseColorInput(accentInput);
  if (!parsed) return fallback;
  const lightBg: RgbColor = { r: 248, g: 250, b: 252 };
  if (getContrastRatio(parsed, lightBg) >= 3.0) {
    return rgbToHex(parsed);
  }
  return fallback;
}

const UNSAFE_CSS_RE =
  /(?:url\s*\(|expression\s*\(|javascript:|data:|@import|behavior\s*:|-moz-binding|;|<|>|\{|\})/i;
const VALID_GRADIENT_FN_RE =
  /^(?:repeating-)?(?:linear|radial|conic)-gradient\(.+\)$/is;
const VALID_SINGLE_CSS_COLOR_RE =
  /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;

function hasBalancedParens(input: string): boolean {
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function splitTopLevelCommaLayers(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts.filter(Boolean);
}

export function sanitizeCustomCssGradient(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  let cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
  if (!cleaned) return fallback;

  // Allow users to paste declarations directly from CSS generators
  cleaned = cleaned
    .replace(/^(?:background-image|background-color|background)\s*:\s*/i, "")
    .replace(/;\s*$/, "")
    .trim();

  if (!cleaned || UNSAFE_CSS_RE.test(cleaned)) return fallback;
  if (!hasBalancedParens(cleaned)) return fallback;

  const parsedSingle = parseColorInput(cleaned);
  if (parsedSingle) {
    if (VALID_SINGLE_CSS_COLOR_RE.test(cleaned)) return cleaned;
    return formatRgbString(parsedSingle);
  }

  const layers = splitTopLevelCommaLayers(cleaned);
  if (layers.length === 0) return fallback;

  const allValid = layers.every(
    (layer) =>
      (VALID_GRADIENT_FN_RE.test(layer) && layer.includes(",")) ||
      VALID_SINGLE_CSS_COLOR_RE.test(layer)
  );
  if (allValid) return cleaned;

  return fallback;
}

export function extractFirstColorFromCss(cssExpr: unknown): string | null {
  if (typeof cssExpr !== "string" || !cssExpr.trim()) return null;
  const tokenRegex =
    /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/gi;
  const matches = cssExpr.match(tokenRegex);
  if (matches) {
    for (const token of matches) {
      const parsed = parseColorInput(token);
      if (parsed) return rgbToHex(parsed);
    }
  }
  const direct = parseColorInput(cssExpr);
  return direct ? rgbToHex(direct) : null;
}

export function getHeroBackdropBaseColor(
  rawTheme?: Partial<HeroThemeConfig> | null
): string {
  const theme = normalizeHeroTheme(rawTheme);
  if (theme.mode === "custom") {
    return extractFirstColorFromCss(theme.customCssGradient) || theme.startColor;
  }
  return theme.startColor;
}

export function buildGradientExpression(theme: HeroThemeConfig): string {
  const startRgb = toCssRgb(theme.startColor, DEFAULT_HERO_THEME.startColor);
  const midRgb = toCssRgb(theme.midColor, DEFAULT_HERO_THEME.midColor);
  const endRgb = toCssRgb(theme.endColor, DEFAULT_HERO_THEME.endColor);

  const stops: Array<{ color: string; pct: number }> = [
    { color: startRgb, pct: clampPercent(theme.startStopPercent, 0) },
  ];
  if (theme.useMidColor) {
    stops.push({ color: midRgb, pct: clampPercent(theme.midStopPercent, 50) });
  }
  stops.push({ color: endRgb, pct: clampPercent(theme.endStopPercent, 100) });
  stops.sort((a, b) => a.pct - b.pct);

  const stopsSql = stops.map((s) => `${s.color} ${s.pct}%`).join(", ");
  if (theme.gradientShape === "radial") {
    return `radial-gradient(circle at 50% 24%, ${stopsSql})`;
  }
  return `linear-gradient(${clampAngleDeg(theme.angleDeg, 180)}deg, ${stopsSql})`;
}

export function normalizeHeroTheme(
  raw?: Partial<HeroThemeConfig> | null,
  fallback: HeroThemeConfig = DEFAULT_HERO_THEME
): HeroThemeConfig {
  const mode: HeroColorMode =
    raw?.mode === "solid" || raw?.mode === "custom" || raw?.mode === "gradient"
      ? raw.mode
      : fallback.mode;

  const startColor = normalizeHexColor(raw?.startColor, fallback.startColor);
  const midColor = normalizeHexColor(raw?.midColor, fallback.midColor);
  const useMidColor =
    raw?.useMidColor !== undefined ? Boolean(raw.useMidColor) : fallback.useMidColor;
  const endColor = normalizeHexColor(raw?.endColor, fallback.endColor);
  const fadeToPageBottom =
    raw?.fadeToPageBottom !== undefined
      ? Boolean(raw.fadeToPageBottom)
      : fallback.fadeToPageBottom;
  const gradientShape: HeroGradientShape =
    raw?.gradientShape === "radial" || raw?.gradientShape === "linear"
      ? raw.gradientShape
      : fallback.gradientShape;

  const angleDeg = clampAngleDeg(raw?.angleDeg, fallback.angleDeg);
  const startStopPercent = clampPercent(raw?.startStopPercent, fallback.startStopPercent);
  const midStopPercent = clampPercent(raw?.midStopPercent, fallback.midStopPercent);
  const endStopPercent = clampPercent(raw?.endStopPercent, fallback.endStopPercent);

  const generatedExpr = buildGradientExpression({
    ...fallback,
    mode,
    startColor,
    midColor,
    useMidColor,
    endColor,
    fadeToPageBottom,
    gradientShape,
    angleDeg,
    startStopPercent,
    midStopPercent,
    endStopPercent,
  });

  const customCssGradient = sanitizeCustomCssGradient(
    raw?.customCssGradient,
    fallback.customCssGradient || generatedExpr
  );

  const headlineColor = normalizeHexColor(raw?.headlineColor, fallback.headlineColor);
  const subheadlineColor = normalizeHexColor(
    raw?.subheadlineColor,
    fallback.subheadlineColor
  );
  const derivedStart =
    mode === "custom" ? extractFirstColorFromCss(customCssGradient) || startColor : startColor;
  const accentColor = normalizeHexColor(
    raw?.accentColor,
    derivedStart || fallback.accentColor
  );

  const imageBlendTopPercent = clampPercent(
    raw?.imageBlendTopPercent,
    fallback.imageBlendTopPercent,
    0,
    45
  );
  const imageBlendBottomPercent = clampPercent(
    raw?.imageBlendBottomPercent,
    fallback.imageBlendBottomPercent,
    0,
    35
  );

  return {
    mode,
    startColor,
    midColor,
    useMidColor,
    endColor,
    fadeToPageBottom,
    gradientShape,
    angleDeg,
    startStopPercent,
    midStopPercent,
    endStopPercent,
    customCssGradient,
    headlineColor,
    subheadlineColor,
    accentColor,
    imageBlendTopPercent,
    imageBlendBottomPercent,
  };
}

export function buildHeroBackgroundCss(
  rawTheme?: Partial<HeroThemeConfig> | null
): string {
  const theme = normalizeHeroTheme(rawTheme);
  if (theme.mode === "solid") {
    const solidRgb = toCssRgb(theme.startColor, DEFAULT_HERO_THEME.startColor);
    if (theme.fadeToPageBottom) {
      return `linear-gradient(180deg, ${solidRgb} 0%, ${solidRgb} 70%, rgb(255, 255, 255) 100%)`;
    }
    return solidRgb;
  }

  if (theme.mode === "custom") {
    return sanitizeCustomCssGradient(
      theme.customCssGradient,
      buildGradientExpression(theme)
    );
  }

  return buildGradientExpression(theme);
}

export function buildHeroImageMaskCss(
  rawTheme?: Partial<HeroThemeConfig> | null
): string {
  const theme = normalizeHeroTheme(rawTheme);
  const topPct = clampPercent(theme.imageBlendTopPercent, 26, 0, 45);
  const bottomPct = clampPercent(theme.imageBlendBottomPercent, 20, 0, 35);
  if (topPct === 0 && bottomPct === 0) {
    return "none";
  }
  const bottomStart = Math.max(topPct + 10, 100 - bottomPct);
  return `linear-gradient(to bottom, ${topPct > 0 ? `transparent 0%, black ${topPct}%` : "black 0%"}, black ${bottomStart}%, ${bottomPct > 0 ? "transparent 100%" : "black 100%"})`;
}

export function buildCategoryAccentFillCss(
  rawTheme?: Partial<HeroThemeConfig> | null
): string {
  const theme = normalizeHeroTheme(rawTheme);
  if (theme.mode === "solid") {
    return toCssRgb(theme.startColor, "#22577A");
  }
  if (theme.mode === "custom") {
    return sanitizeCustomCssGradient(
      theme.customCssGradient,
      `linear-gradient(90deg, ${toCssRgb(theme.startColor, "#22577A")} 0%, ${toCssRgb(theme.accentColor, "#3393B8")} 100%)`
    );
  }

  const startRgb = toCssRgb(theme.startColor, "#22577A");
  const endIsNearWhite =
    getRelativeLuminance(parseColorInput(theme.endColor) || { r: 255, g: 255, b: 255 }) > 0.85;
  const tailColor = endIsNearWhite
    ? toCssRgb(theme.useMidColor ? theme.midColor : theme.accentColor, "#3393B8")
    : toCssRgb(theme.endColor, "#5CB6D2");

  if (theme.useMidColor && !endIsNearWhite) {
    return `linear-gradient(90deg, ${startRgb} 0%, ${toCssRgb(theme.midColor, "#3393B8")} 50%, ${tailColor} 100%)`;
  }
  return `linear-gradient(90deg, ${startRgb} 0%, ${tailColor} 100%)`;
}

export function applySameColorToTheme(
  theme: HeroThemeConfig,
  colorInput: string,
  fadeToPageBottom = false
): HeroThemeConfig {
  const hex = normalizeHexColor(colorInput, theme.startColor);
  const rgbStr = toCssRgb(hex, theme.startColor);
  const readableHeadline = pickReadableTextColor(hex);
  const readableSub = pickReadableSubheadlineColor(hex);
  return {
    ...theme,
    mode: "solid",
    startColor: hex,
    midColor: hex,
    useMidColor: false,
    endColor: fadeToPageBottom ? "#FFFFFF" : hex,
    fadeToPageBottom,
    customCssGradient: rgbStr,
    headlineColor: readableHeadline,
    subheadlineColor: readableSub,
    accentColor: hex === "#FFFFFF" ? "#22577A" : hex,
  };
}

export function describeHeroThemeSummary(
  rawTheme?: Partial<HeroThemeConfig> | null
): string {
  const theme = normalizeHeroTheme(rawTheme);
  const baseHex = getHeroBackdropBaseColor(theme);
  const start = parseColorInput(baseHex);
  const startLabel = start ? formatRgbString(start) : baseHex;
  if (theme.mode === "solid") {
    return `Solid · ${startLabel}`;
  }
  if (theme.mode === "custom") {
    return `CSS · ${startLabel}`;
  }
  return `Gradient · ${theme.angleDeg}°`;
}

export type PageHeroThemeKey = "projects" | "resources" | "contact";

export interface PageHeroThemesMap {
  projects: HeroThemeConfig;
  resources: HeroThemeConfig;
  contact: HeroThemeConfig;
}

export const DEFAULT_PAGE_HERO_THEMES: PageHeroThemesMap = {
  projects: { ...DEFAULT_HERO_THEME },
  resources: { ...DEFAULT_HERO_THEME },
  contact: { ...DEFAULT_HERO_THEME },
};

export function normalizePageHeroThemes(
  raw?: Partial<Record<PageHeroThemeKey, Partial<HeroThemeConfig>>> | null
): PageHeroThemesMap {
  return {
    projects: normalizeHeroTheme(raw?.projects, DEFAULT_PAGE_HERO_THEMES.projects),
    resources: normalizeHeroTheme(raw?.resources, DEFAULT_PAGE_HERO_THEMES.resources),
    contact: normalizeHeroTheme(raw?.contact, DEFAULT_PAGE_HERO_THEMES.contact),
  };
}

